// The OpenCode adapter — §3.3.
//
// This is the only file that names the host runtime. It is the same seam
// skills/anymake-dispatch/SKILL.md draws for dispatch, drawn again for driving:
// adding Claude Code or a custom runner is a new adapter file, not a rewrite.
//
// Integration risk, stated plainly (and it is why `--probe` exists): OpenCode's
// non-interactive flags and on-disk session layout are a moving target. `--probe`
// starts a trivial session and reports which of the four capabilities it found and
// how. Everything downstream reads a normalized telemetry/usage.jsonl, so a layout
// change is a one-file fix.
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { appendJSONL, readJSONL, exists, log, walk } from '../lib/util.mjs';

const CAPABILITIES = ['start', 'send', 'usage', 'kill'];

export class OpenCodeAdapter {
  constructor({ bin = process.env.ANYMAKE_EVAL_OPENCODE || 'opencode', env, cwd, telemetryDir, caps = null }) {
    this.bin = bin; this.env = env; this.cwd = cwd; this.telemetryDir = telemetryDir;
    this.caps = caps; this.proc = null; this.sessionId = null;
  }

  static id = 'opencode';

  /**
   * Build step 1 of P0, and a real answer rather than an assumption: what does this
   * installed OpenCode actually expose?
   */
  static async probe({ bin = process.env.ANYMAKE_EVAL_OPENCODE || 'opencode', env = process.env } = {}) {
    const found = { adapter: 'opencode', bin, version: null, capabilities: {}, notes: [] };
    try {
      found.version = execFileSync(bin, ['--version'], { encoding: 'utf8', env }).trim();
    } catch (e) {
      found.notes.push(`'${bin} --version' failed: ${String(e.message).split('\n')[0]}`);
      for (const c of CAPABILITIES) found.capabilities[c] = { available: false, how: null };
      return found;
    }
    const help = safe(() => execFileSync(bin, ['run', '--help'], { encoding: 'utf8', env }), '');
    const has = (flag) => help.includes(flag);

    found.capabilities.start = {
      available: /(^|\n)\s*run\b/.test(safe(() => execFileSync(bin, ['--help'], { encoding: 'utf8', env }), '')) || !!help,
      how: has('--print-logs') ? 'opencode run <prompt> --print-logs' : 'opencode run <prompt>',
    };
    found.capabilities.send = {
      available: has('--session') || has('--continue'),
      how: has('--session') ? 'opencode run --session <id> <message>' : (has('--continue') ? 'opencode run --continue <message>' : null),
    };
    const store = findSessionStore(env);
    found.capabilities.usage = {
      available: !!store || has('--json'),
      how: has('--json') ? 'stdout JSON stream' : (store ? `session store at ${store}` : null),
    };
    found.capabilities.kill = { available: true, how: 'SIGTERM to the child process group' };

    for (const c of CAPABILITIES) {
      if (!found.capabilities[c]?.available) {
        found.notes.push(`capability '${c}' not detected — the adapter will degrade and the report will state the gap`);
      }
    }
    return found;
  }

  async start(prompt, { timeoutMs } = {}) {
    const args = ['run', prompt];
    this.proc = spawn(this.bin, args, {
      cwd: this.cwd, env: this.env, stdio: ['pipe', 'pipe', 'pipe'], detached: true,
    });
    this.sessionId = `oc-${this.proc.pid}`;
    this._wire(this.proc);
    if (timeoutMs) this._timer = setTimeout(() => this.kill('cap: wall-clock'), timeoutMs).unref?.();
    return this.sessionId;
  }

  /** The simulated product owner's replies land here. */
  async send(sessionId, message) {
    if (!this.proc || this.proc.killed) throw new Error('session is not running');
    this.proc.stdin.write(message.endsWith('\n') ? message : message + '\n');
    return { ok: true };
  }

  /** Normalized per-message records: tokens, cost, model, timestamps, tool calls. */
  usage() {
    return readJSONL(path.join(this.telemetryDir, 'usage.jsonl'));
  }

  kill(reason = 'kill') {
    clearTimeout(this._timer);
    if (!this.proc) return;
    try { process.kill(-this.proc.pid, 'SIGTERM'); } catch { try { this.proc.kill('SIGTERM'); } catch {} }
    appendJSONL(path.join(this.telemetryDir, 'runner-events.jsonl'), { ts: Date.now(), event: 'kill', reason });
  }

  async waitForExit() {
    if (!this.proc) return { code: 0 };
    return new Promise((res) => this.proc.on('exit', (code, signal) => res({ code, signal })));
  }

  _wire(proc) {
    const raw = path.join(this.telemetryDir, 'host-stdout.log');
    fs.mkdirSync(this.telemetryDir, { recursive: true });
    let buf = '';
    proc.stdout.on('data', (d) => {
      fs.appendFileSync(raw, d);
      buf += d.toString();
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) this._ingest(line);
    });
    proc.stderr.on('data', (d) => fs.appendFileSync(raw, d));
  }

  /**
   * Normalize whatever the host emits into the one shape the collectors read.
   * A line that is not a usage record is transcript, and transcript is kept too —
   * the simulated owner's trigger matching runs off it.
   */
  _ingest(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    let obj = null;
    if (trimmed.startsWith('{')) { try { obj = JSON.parse(trimmed); } catch { obj = null; } }
    if (obj && (obj.tokens || obj.usage || obj.type === 'message')) {
      appendJSONL(path.join(this.telemetryDir, 'usage.jsonl'), normalizeUsage(obj));
      return;
    }
    appendJSONL(path.join(this.telemetryDir, 'transcript.jsonl'), { ts: Date.now(), text: trimmed, role: obj?.role || 'assistant' });
  }
}

/** One place where host field names are guessed, so there is one place to fix. */
export function normalizeUsage(o) {
  const u = o.usage || o.tokens || {};
  return {
    ts: o.ts || o.timestamp || Date.now(),
    agent: o.agent || o.subagent || o.role || 'hub',
    role: o.role || null,
    tier: o.tier ?? null,
    story: o.story ?? null,
    attempt: o.attempt ?? 1,
    model_requested: o.model_requested || o.requested_model || null,
    model_served: o.model_served || o.model || null,
    tokens: {
      in: u.input ?? u.in ?? u.prompt_tokens ?? null,
      out: u.output ?? u.out ?? u.completion_tokens ?? null,
      cache_read: u.cache_read ?? u.cache_read_input_tokens ?? null,
      cache_write: u.cache_write ?? u.cache_creation_input_tokens ?? null,
    },
    usd: o.cost ?? o.usd ?? null,
    duration_ms: o.duration_ms ?? o.duration ?? null,
    reasoning: o.reasoning ?? null,     // absent where the host does not persist it — never inferred
    message: o.text ?? o.message ?? null,
    tool_calls: o.tool_calls || o.tools || [],
    files_read: o.files_read || [],
    skills_invoked: o.skills_invoked || [],
    artifact_written: o.artifact_written || null,
    verdict_emitted: o.verdict_emitted || null,
  };
}

function findSessionStore(env) {
  const candidates = [
    path.join(env.XDG_DATA_HOME || path.join(env.HOME || '', '.local', 'share'), 'opencode'),
    path.join(env.HOME || '', '.opencode'),
    path.join(env.HOME || '', '.cache', 'opencode'),
  ];
  return candidates.find((c) => exists(c)) || null;
}

const safe = (fn, d) => { try { return fn(); } catch { return d; } };

export { walk, log };
