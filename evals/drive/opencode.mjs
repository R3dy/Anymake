// The OpenCode adapter — §3.3.
//
// This is the only file that names the host runtime. It is the same seam
// skills/anymake-dispatch/SKILL.md draws for dispatch, drawn again for driving:
// adding Claude Code or a custom runner is a new adapter file, not a rewrite.
//
// What the host actually exposes (verified against opencode 1.18.29):
//
//   start   `opencode run --format json --dir <arena> <prompt>`
//           One-shot. Emits newline-delimited JSON on stdout and exits when the turn
//           is done. The session id appears in that stream — even on a failed turn.
//   send    `opencode run --session <id> --format json <message>`
//           Also one-shot: a "session" is continued by invoking the CLI again, not by
//           writing to a live process's stdin. The drive loop is turn-based for that
//           reason (see run.mjs → driveLoop).
//   usage   `opencode export <id>` — the authoritative record: per-message tokens
//           {input, output, reasoning, cache:{read,write}}, cost in USD, modelID,
//           providerID, agent, parentID, time{created,completed}, and typed parts
//           (text, reasoning, tool, subtask). Sub-agents are CHILD SESSIONS, so the
//           tree is assembled by exporting the root and every session whose parentID
//           chains back to it.
//   kill    SIGTERM to the child process group.
//
// Two deliberate choices about coupling, because the design's stated risk is that this
// surface moves:
//
//   1. The stdout stream is parsed SHAPE-AGNOSTICALLY. We take a session id and any
//      text we can see, and archive every line verbatim to host-events.jsonl. Nothing
//      downstream depends on the event vocabulary, so a renamed event type costs
//      nothing.
//   2. Telemetry comes from `export`, whose schema is the server's published OpenAPI
//      contract, not from scraped stdout. Everything downstream reads the normalized
//      telemetry/trace.jsonl, so a layout change is a one-file fix here.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { appendJSONL, readJSONL, writeJSON, writeText, ensureDir, exists, log } from '../lib/util.mjs';

const CAPABILITIES = ['start', 'send', 'usage', 'kill'];

/**
 * Run a command and take BOTH streams, whatever the exit code.
 *
 * Not a detail: `opencode run --help` writes its help to stderr and exits 0, so a
 * reader that takes stdout-on-success sees an empty string and concludes the flags do
 * not exist. That is exactly how the first version of this probe reported MISSING for
 * capabilities the host has.
 */
function capture(bin, args, env, timeout = 30000) {
  const r = spawnSync(bin, args, { encoding: 'utf8', env, timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.error) return { ok: false, out, error: String(r.error.message).split('\n')[0], status: null };
  return { ok: r.status === 0, out, error: r.status === 0 ? null : `exit ${r.status}`, status: r.status };
}

/** `opencode export` prints a human line before the JSON; start at the first brace. */
export function parseLeadingJSON(text) {
  const i = text.indexOf('{');
  if (i < 0) return null;
  try { return JSON.parse(text.slice(i)); } catch { return null; }
}

export class OpenCodeAdapter {
  constructor({ bin = process.env.ANYMAKE_EVAL_OPENCODE || 'opencode', env, cwd, telemetryDir, modelConfig }) {
    this.bin = bin; this.env = env; this.cwd = cwd; this.telemetryDir = telemetryDir;
    this.modelConfig = modelConfig;
    this.proc = null; this.sessionId = null; this.exportedThrough = 0;
  }

  static id = 'opencode';

  /**
   * Build step 1 of P0, and the answer to "what does THIS install expose?" — asked
   * empirically. An earlier version of this probe grepped `--help` for flag names and
   * got both answers wrong on a real machine: the command list renders as
   * "  opencode run [message..]", not "  run", so a line-anchored regex missed it.
   * Help text is a moving target; running the thing is not.
   */
  static async probe({ bin = process.env.ANYMAKE_EVAL_OPENCODE || 'opencode', env = process.env, live = true } = {}) {
    const found = { adapter: 'opencode', bin, version: null, capabilities: {}, notes: [], raw: {} };
    const set = (cap, available, how, evidence) => {
      // `how` is only meaningful for a capability we actually found. Printing one for a
      // MISSING capability is what made the first version of this output incoherent.
      found.capabilities[cap] = { available, how: available ? how : null, evidence };
    };

    const version = capture(bin, ['--version'], env, 15000);
    if (!version.ok && !version.out.trim()) {
      found.notes.push(`'${bin} --version' failed: ${version.error}. Is opencode on PATH, or set ANYMAKE_EVAL_OPENCODE.`);
      for (const c of CAPABILITIES) set(c, false, null, 'binary not runnable');
      return found;
    }
    found.version = version.out.trim().split('\n').pop();

    const topHelp = capture(bin, ['--help'], env).out;
    const runHelp = capture(bin, ['run', '--help'], env).out;
    found.raw = { topHelp, runHelp };
    const hasRunCommand = /(^|\n)\s*(?:opencode\s+)?run\b/.test(topHelp);
    const flag = (f) => runHelp.includes(f);

    // --- start: does a `run` invocation actually create a session? ---
    // The throwaway HOME stays alive for the send and usage checks below: the session
    // lives in that store, and exporting it from the ambient HOME would report "session
    // not found" and blame the host for the probe's own tidiness.
    let liveSession = null, liveDetail = 'not attempted (--no-live)';
    let probeEnv = env, home = null, dir = null;
    if (live) {
      home = fs.mkdtempSync(path.join(os.tmpdir(), 'anymake-probe-home-'));
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anymake-probe-dir-'));
      probeEnv = { ...env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local', 'share') };
      const args = ['run', ...(flag('--format') ? ['--format', 'json'] : []), ...(flag('--dir') ? ['--dir', dir] : []),
        'Reply with the single word READY.'];
      const res = capture(bin, args, probeEnv, 90000);
      liveSession = firstSessionId(res.out);
      liveDetail = liveSession
        ? (res.ok ? `session ${liveSession} created and the turn completed`
                  : `session ${liveSession} created; the turn itself failed (${providerError(res.out) || 'see raw output'})`)
        : `no session id in the output (${res.error || 'exit 0'})`;
      found.raw.liveRun = res.out.slice(0, 4000);
    }

    // A created session proves the mechanism even when the turn fails on provider auth:
    // the harness's job here is to find the seam, not to check the user's credentials.
    set('start', !!liveSession || hasRunCommand,
      `${bin} run${flag('--format') ? ' --format json' : ''}${flag('--dir') ? ' --dir <arena>' : ''} <prompt>`, liveDetail);

    // --- send: continuation is a NEW invocation against the same session id ---
    const canSession = flag('--session');
    const canContinue = flag('--continue');
    let sendEvidence = canSession ? 'run --help advertises --session' : (canContinue ? 'run --help advertises --continue' : 'neither --session nor --continue found');
    if (live && liveSession && canSession) {
      const res = capture(bin, ['run', '--session', liveSession, '--format', 'json', 'ok'], probeEnv, 60000);
      // Only a SESSION error is a send failure. A provider or auth error means the
      // continuation was accepted and the model call failed after it — a different
      // problem, and not this capability's.
      const sessionError = /session not found|unknown session|no such session/i.test(res.out);
      sendEvidence = sessionError
        ? `run --session was rejected for a session that exists — the continuation path is broken`
        : `run --session ${liveSession} was accepted${res.ok ? '' : ` (the turn then failed on the provider: ${providerError(res.out) || 'see raw output'})`}`;
      found.raw.liveSend = res.out.slice(0, 2000);
      if (sessionError) { set('send', false, null, sendEvidence); }
    }
    if (!found.capabilities.send) {
      set('send', canSession || canContinue,
        canSession ? `${bin} run --session <id> <message>` : `${bin} run --continue <message>`, sendEvidence);
    }

    // --- usage: `export` is the authoritative per-message record ---
    let usageOk = false, usageEvidence = 'no session to export', how = `${bin} export <session-id>`;
    if (liveSession) {
      // A cold, isolated HOME makes the first export slow — it brings its own server
      // up. 30s was enough to look broken and not enough to be true.
      const res = capture(bin, ['export', liveSession], probeEnv, 120000);
      const parsed = parseLeadingJSON(res.out);
      if (parsed?.info) {
        usageOk = true;
        usageEvidence = `export parsed · ${exportCoverage(parsed).join(' · ')}`;
        found.raw.exportKeys = Object.keys(parsed);
      } else {
        usageEvidence = `export did not return parseable JSON (${res.error || 'exit 0'}: ${res.out.replace(/\u001b\[[0-9;]*m/g, '').trim().split('\n').pop()?.slice(0, 120)})`;
      }
    }
    if (!usageOk) {
      const store = findSessionStore(env);
      if (store) { usageOk = true; how = `session store at ${store}`; usageEvidence = `${usageEvidence}; falling back to the on-disk session store`; }
    }
    set('usage', usageOk, how, usageEvidence);

    if (home) { try { fs.rmSync(home, { recursive: true, force: true }); fs.rmSync(dir, { recursive: true, force: true }); } catch {} }

    set('kill', true, 'SIGTERM to the child process group', 'always available');

    for (const c of CAPABILITIES) {
      if (!found.capabilities[c].available) {
        found.notes.push(`capability '${c}' not detected — ${found.capabilities[c].evidence}`);
      }
    }
    if (found.capabilities.start.available && !live) {
      found.notes.push('help-text detection only; re-run without --no-live to confirm against a real session');
    }
    return found;
  }

  /* ---------------- driving ---------------- */

  /**
   * `opencode run` is one-shot: this resolves when the turn is DONE, not when the
   * session is over. run.mjs's drive loop is turn-based for that reason.
   */
  async start(prompt, { timeoutMs } = {}) {
    const res = await this._run(['run', '--format', 'json', '--dir', this.cwd, ...this._modelArgs(), prompt], timeoutMs);
    this.sessionId = this.sessionId || res.sessionId;
    await this.collect();
    return this.sessionId;
  }

  /** The simulated product owner's replies land here — as a fresh invocation. */
  async send(sessionId, message) {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('no session to continue — start() never captured a session id');
    const res = await this._run(['run', '--session', id, '--format', 'json', '--dir', this.cwd, message], null);
    await this.collect();
    return { ok: res.code === 0, code: res.code };
  }

  /** Normalized per-message records, as written by collect(). */
  usage() { return readJSONL(path.join(this.telemetryDir, 'trace.jsonl')); }

  kill(reason = 'kill') {
    clearTimeout(this._timer);
    if (!this.proc || this.proc.exitCode != null) return;
    try { process.kill(-this.proc.pid, 'SIGTERM'); } catch { try { this.proc.kill('SIGTERM'); } catch {} }
    appendJSONL(path.join(this.telemetryDir, 'runner-events.jsonl'), { ts: Date.now(), event: 'kill', reason });
  }

  /** The current turn's child, for cap enforcement. Resolves immediately when idle. */
  async waitForExit() {
    if (!this.proc || this.proc.exitCode != null) return { code: this.proc?.exitCode ?? 0 };
    return new Promise((res) => this.proc.on('exit', (code, signal) => res({ code, signal })));
  }

  _modelArgs() {
    const m = this.modelConfig?.opencodeRunArgs;
    return Array.isArray(m) ? m : [];
  }

  _run(args, timeoutMs) {
    ensureDir(this.telemetryDir);
    return new Promise((resolve) => {
      const proc = spawn(this.bin, args, { cwd: this.cwd, env: this.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
      this.proc = proc;
      let sessionId = null, buf = '';
      if (timeoutMs) this._timer = setTimeout(() => this.kill('cap: wall-clock'), timeoutMs).unref?.();

      proc.stdout.on('data', (d) => {
        buf += d.toString();
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          const id = this._ingestLine(line);
          if (id && !sessionId) sessionId = id;
        }
      });
      proc.stderr.on('data', (d) => fs.appendFileSync(path.join(this.telemetryDir, 'host-stderr.log'), d));
      proc.on('error', (e) => { log.error(`opencode spawn failed: ${e.message}`); });
      proc.on('exit', (code) => {
        clearTimeout(this._timer);
        if (buf.trim()) { const id = this._ingestLine(buf); if (id && !sessionId) sessionId = id; }
        resolve({ code, sessionId: sessionId || this.sessionId });
      });
    });
  }

  /**
   * Shape-agnostic on purpose: take a session id and any text we can see, archive the
   * line verbatim, and depend on nothing else. The event vocabulary is the host's to
   * change; the authoritative telemetry comes from export().
   */
  _ingestLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    appendJSONL(path.join(this.telemetryDir, 'host-events.jsonl'), { ts: Date.now(), raw: trimmed.slice(0, 8000) });
    if (!trimmed.startsWith('{')) return null;
    let obj;
    try { obj = JSON.parse(trimmed); } catch { return null; }
    if (obj.type === 'error') {
      appendJSONL(path.join(this.telemetryDir, 'host-errors.jsonl'), { ts: Date.now(), error: obj.error ?? obj });
    }
    return obj.sessionID || obj.sessionId || (obj.properties && obj.properties.sessionID) || null;
  }

  /**
   * Pull the authoritative record for the root session and every descendant, and
   * normalize it into trace.jsonl. Sub-agents are child sessions in this host, so the
   * dispatch tree is a session tree — which is exactly what §7.2 wants to draw.
   */
  async collect() {
    if (!this.sessionId) return;
    const roots = new Set([this.sessionId]);
    const sessions = [];
    for (const id of this.discoverSessions()) {
      const data = this.export(id);
      if (!data) continue;
      const parent = data.info?.parentID;
      if (roots.has(id) || (parent && roots.has(parent))) { roots.add(id); sessions.push({ id, data, parent: parent || null }); }
    }
    if (!sessions.length) {
      const root = this.export(this.sessionId);
      if (root) sessions.push({ id: this.sessionId, data: root, parent: null });
    }

    const out = path.join(this.telemetryDir, 'trace.jsonl');
    fs.writeFileSync(out, '');                       // export is a full snapshot, not a delta
    fs.writeFileSync(path.join(this.telemetryDir, 'transcript.jsonl'), '');
    for (const s of sessions) {
      writeJSON(path.join(this.telemetryDir, 'sessions', `${s.id}.json`), s.data);
      for (const rec of normalizeSession(s, this.sessionId)) {
        appendJSONL(out, rec);
        if (rec.message) {
          appendJSONL(path.join(this.telemetryDir, 'transcript.jsonl'),
            { ts: rec.ts, role: 'assistant', agent: rec.agent, text: rec.message });
        }
      }
    }
  }

  discoverSessions() {
    const res = capture(this.bin, ['session', 'list'], this.env);
    const ids = [...res.out.matchAll(/\bses_[A-Za-z0-9]+/g)].map((m) => m[0]);
    return [...new Set([this.sessionId, ...ids])].filter(Boolean);
  }

  export(id) {
    const res = capture(this.bin, ['export', id], this.env, 120000);
    return parseLeadingJSON(res.out);
  }
}

/* ---------------- normalization ---------------- */

/**
 * One place where host field names are read, so there is one place to fix.
 * Field-for-field against opencode's published message schema:
 *   AssistantMessage → tokens{input,output,reasoning,cache{read,write}}, cost, modelID,
 *   providerID, agent, parentID, time{created,completed}
 *   parts[] → TextPart · ReasoningPart · ToolPart · SubtaskPart
 */
export function normalizeSession({ id, data, parent }, rootId) {
  const out = [];
  const messages = data.messages || [];
  for (const m of messages) {
    const info = m.info || m;
    if (info.role !== 'assistant') continue;
    const parts = m.parts || [];
    const tokens = info.tokens || {};
    const created = info.time?.created ?? null;
    const completed = info.time?.completed ?? null;

    out.push({
      ts: created,
      session: id,
      parentSession: parent,
      agent: info.agent || (id === rootId ? 'hub' : 'sub-agent'),
      role: roleFor(info.agent, id === rootId),
      tier: null,
      story: storyFrom(parts),
      attempt: 1,
      // requested vs served is how EFF-07 (tier binding) falls out for free; the host
      // reports what it served, and the arena's env records what was asked for.
      model_requested: process.env[`ANYMAKE_MODEL_TIER${tierFor(info.agent)}`] || null,
      model_served: info.modelID || null,
      provider: info.providerID || null,
      tokens: {
        in: tokens.input ?? null,
        out: tokens.output ?? null,
        cache_read: tokens.cache?.read ?? null,
        cache_write: tokens.cache?.write ?? null,
        reasoning: tokens.reasoning ?? null,
      },
      usd: info.cost ?? null,
      duration_ms: created != null && completed != null ? completed - created : null,
      // Present only when the provider and host actually persist it. Never inferred
      // from the message text and presented as reasoning (§7.1).
      reasoning: parts.filter((p) => p.type === 'reasoning').map((p) => p.text).join('\n') || null,
      message: parts.filter((p) => p.type === 'text' && !p.synthetic).map((p) => p.text).join('\n') || null,
      tool_calls: parts.filter((p) => p.type === 'tool').map(toolCall),
      files_read: parts.filter((p) => p.type === 'tool').map(fileRead).filter(Boolean),
      skills_invoked: parts.filter((p) => p.type === 'tool' && /skill/i.test(p.tool || ''))
        .map((p) => p.state?.input?.name || p.state?.input?.skill).filter(Boolean),
      // A SubtaskPart IS a dispatch: the child session it spawns is the next node in
      // the tree, which is what CNF-01/02 and PRB-DISP-01 read.
      subtasks: parts.filter((p) => p.type === 'subtask')
        .map((p) => ({ agent: p.agent, description: p.description, model: p.model?.modelID || null })),
      compaction: parts.some((p) => p.type === 'compaction') || null,
      artifact_written: parts.filter((p) => p.type === 'tool' && /write/i.test(p.tool || ''))
        .map((p) => p.state?.input?.filePath || p.state?.input?.path).filter(Boolean).pop() || null,
      verdict_emitted: verdictFrom(parts),
      finish: info.finish ?? null,
    });
  }
  return out;
}

const toolCall = (p) => ({
  name: p.tool || 'tool',
  args: digest(p.state?.input),
  result: typeof p.state?.output === 'string' ? `${p.state.output.length} chars` : null,
  ms: p.state?.time?.end != null && p.state?.time?.start != null ? p.state.time.end - p.state.time.start : null,
});

function fileRead(p) {
  if (!/read|grep|glob/i.test(p.tool || '')) return null;
  const fp = p.state?.input?.filePath || p.state?.input?.path;
  if (!fp) return null;
  const output = typeof p.state?.output === 'string' ? p.state.output : '';
  return { path: fp, tokens: Math.round(output.length / 4) };  // bytes/4 — approximate, and labeled as such in the report
}

const digest = (input) => {
  if (input == null) return '';
  const s = typeof input === 'string' ? input : JSON.stringify(input);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
};

const ROLE_BY_AGENT = {
  'anymake-planner': 'planner', 'anymake-worker': 'worker', 'anymake-validator': 'validator',
  'anymake-experience-runner': 'experience-runner', 'anymake-orchestrator': 'orchestrator',
  'anymake-product-owner-proxy': 'proxy', 'anymake-plan-reviewer': 'plan-reviewer',
  'anymake-solution-architect': 'solution-architect', 'anymake-cartographer': 'cartographer',
};
const roleFor = (agent, isRoot) => ROLE_BY_AGENT[agent] || (isRoot ? 'hub' : agent || 'sub-agent');

// AGENTS/arbiter.md → Model Tier Policy. Used only to name the tier a turn *asked* for;
// what it got is read back off the message.
const TIER_BY_ROLE = { orchestrator: 1, proxy: 1, 'solution-architect': 1, 'plan-reviewer': 2, planner: 2, validator: 2, 'experience-runner': 2, worker: 3, cartographer: 2 };
const tierFor = (agent) => TIER_BY_ROLE[ROLE_BY_AGENT[agent]] ?? 1;

const storyFrom = (parts) => {
  for (const p of parts) {
    const m = /story[- ]([\d.]+)/i.exec(p.text || p.description || p.prompt || '');
    if (m) return m[1];
  }
  return null;
};

const verdictFrom = (parts) => {
  for (const p of parts) {
    const m = /VERDICT:\s*(PASS|FAIL|N\/A|BLOCKED|APPROVED|NEEDS CHANGES)/i.exec(p.text || '');
    if (m) return m[1].toUpperCase();
  }
  return null;
};

/* ---------------- probe helpers ---------------- */

const firstSessionId = (text) => (/\bses_[A-Za-z0-9]+/.exec(text || '') || [])[0] || null;

const providerError = (text) => {
  const m = /"message":"((?:[^"\\]|\\.){0,200})"/.exec(text || '');
  return m ? m[1].replace(/\\"/g, '"').trim() : null;
};

/** Which of §7.1's trace fields this install's export can actually fill. */
function exportCoverage(parsed) {
  const messages = parsed.messages || [];
  const assistant = messages.filter((m) => (m.info || m).role === 'assistant');
  const parts = assistant.flatMap((m) => m.parts || []);
  const has = (f) => (f ? 'yes' : 'NO');
  return [
    `messages: ${messages.length}`,
    `tokens: ${has(assistant.some((m) => (m.info || m).tokens))}`,
    `cost: ${has(assistant.some((m) => (m.info || m).cost != null))}`,
    `model: ${has(assistant.some((m) => (m.info || m).modelID))}`,
    `agent: ${has(assistant.some((m) => (m.info || m).agent))}`,
    `reasoning: ${has(parts.some((p) => p.type === 'reasoning'))}`,
    `tools: ${has(parts.some((p) => p.type === 'tool'))}`,
  ];
}

function findSessionStore(env) {
  const candidates = [
    path.join(env.XDG_DATA_HOME || path.join(env.HOME || '', '.local', 'share'), 'opencode'),
    path.join(env.HOME || '', '.opencode'),
    path.join(env.HOME || '', '.cache', 'opencode'),
  ];
  return candidates.find((c) => exists(c)) || null;
}

export { writeText };
