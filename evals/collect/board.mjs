// Board snapshot series — §3.6.
//
// Polling .anymake/board-state.json turns a run into a time series rather than a
// final state, which is what makes stall detection, per-phase spend attribution and
// the report's run timeline possible. It costs nothing, because the file is already
// the system's structured spine (INV-004).
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { readJSONL, readText, readJSON, exists, groupBy } from '../lib/util.mjs';
import { REPO_ROOT } from '../lib/util.mjs';

/** Snapshot the board on a timer for the life of a cell. */
export function startSnapshotter(arenaDir, telemetryDir, intervalMs = 5000) {
  const out = path.join(telemetryDir, 'board-snapshots.jsonl');
  fs.mkdirSync(telemetryDir, { recursive: true });
  let last = null;
  const tick = () => {
    for (const f of findBoardStates(arenaDir)) {
      let raw;
      try { raw = fs.readFileSync(f, 'utf8'); } catch { continue; }
      if (raw === last) continue;      // only changes are recorded — the series, not the polling
      last = raw;
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { /* invalid states are data too (CNF-08) */ }
      fs.appendFileSync(out, JSON.stringify({ ts: Date.now(), file: path.relative(arenaDir, f), valid: parsed != null, state: parsed, rawLength: raw.length }) + '\n');
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  return { stop: () => { tick(); clearInterval(timer); } };
}

function findBoardStates(dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findBoardStates(full, out, depth + 1);
    else if (e.name === 'board-state.json') out.push(full);
  }
  return out;
}

/** Read the collected series back and answer the questions the metrics ask of it. */
export class Board {
  constructor(snapshots, sessionLog, boardMd, phaseState) {
    this.snapshots = snapshots;
    this.sessionLog = sessionLog;
    this.boardMd = boardMd || '';
    this.phaseState = phaseState || '';
    this.final = snapshots.length ? snapshots[snapshots.length - 1].state : null;
  }

  static load(cellDir, arenaDir) {
    const tel = path.join(cellDir, 'telemetry');
    const snapshots = readJSONL(path.join(tel, 'board-snapshots.jsonl'));
    const project = findProjectDir(arenaDir);
    return new Board(
      snapshots,
      project ? readJSONL(path.join(project, '.anymake', 'session-log.jsonl')) : [],
      project ? readText(path.join(project, 'BOARD.md')) : '',
      project ? readText(path.join(project, '.anymake', 'PHASE_STATE.md')) : '',
    );
  }

  get stories() { return this.final?.stories || []; }
  get doneStories() { return this.stories.filter((s) => s.status === 'done'); }
  get inFlight() { return this.stories.filter((s) => ['in_progress', 'validating', 'experience'].includes(s.status)); }

  /** Gate decisions from the BOARD.md table — the artifact the proxy is told to write. */
  get gateDecisions() {
    const rows = [];
    const section = /## Gate Decisions([\s\S]*?)(\n## |$)/.exec(this.boardMd);
    if (section) {
      for (const line of section[1].split('\n')) {
        const m = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
        if (m && !/^-+$/.test(m[2]) && !/gate/i.test(m[1])) rows.push({ gate: m[1], verdict: m[2], notes: m[3] });
      }
    }
    for (const e of this.sessionLog) {
      if (e.type === 'gate') rows.push({ gate: e.gate, verdict: e.verdict, notes: e.notes || '' });
    }
    return rows;
  }

  /** Mean rounds to approval, per gate — AUT-01. A gate approved on round 1 counts 1. */
  gateRounds() {
    const per = groupBy(this.gateDecisions, (g) => g.gate);
    const rounds = [...per.values()].map((gs) => gs.length);
    return rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : null;
  }

  get rejections() {
    return this.gateDecisions.filter((g) => /needs changes|reject/i.test(g.verdict || ''))
      .map((g) => ({ gate: g.gate, reason: g.notes }));
  }

  get escalations() {
    const fromLog = this.sessionLog.filter((e) => e.type === 'escalation')
      .map((e) => ({ reason: e.reason || e.message || '', at: e.ts, kind: e.kind || 'unknown' }));
    const fromBoard = [...this.boardMd.matchAll(/ESCALAT(?:ED|ION):?\s*(.+)/gi)].map((m) => ({ reason: m[1], at: null, kind: 'board' }));
    return [...fromLog, ...fromBoard];
  }

  /** INV-018 — the DISPATCH lines the Run Log is required to carry. */
  get dispatchLines() {
    const out = this.sessionLog.filter((e) => e.type === 'dispatch')
      .map((e) => ({ agent: e.agent, story: e.story ?? null, at: e.ts }));
    for (const m of this.boardMd.matchAll(/DISPATCH\s+(\S+)(?:\s+story\s+(\S+))?/g)) {
      out.push({ agent: m[1], story: m[2] ?? null, at: null });
    }
    return out;
  }

  /** AUT-04 — validation FAIL→retry, experience FAIL→retry, worker re-dispatch. */
  retries() {
    const events = this.sessionLog.filter((e) => e.type === 'retry' || /retry/i.test(e.reason || ''));
    const attempts = this.stories.reduce((a, s) => a + Math.max(1, s.attempts || 1), 0);
    return { retries: events.length, attempts, stories: this.stories.length };
  }

  /** CNF-07 — counters within the arbiter's ceilings; escalation at the right threshold. */
  retryPolicyAdherence(ceiling = 2) {
    const over = this.stories.filter((s) => (s.attempts || 1) > ceiling + 1);
    const escalatedAtCeiling = this.stories.filter((s) => (s.attempts || 1) > ceiling
      && this.escalations.some((e) => String(e.reason || '').includes(String(s.id))));
    const breaches = over.filter((s) => !escalatedAtCeiling.includes(s));
    return this.stories.length ? (this.stories.length - breaches.length) / this.stories.length : null;
  }

  /** AUT-08 — in-flight stories with no board event past the stall threshold. */
  stallRate(thresholdMs = 15 * 60 * 1000) {
    if (!this.snapshots.length) return null;
    const lastTouch = new Map();
    for (const s of this.snapshots) {
      for (const st of s.state?.stories || []) lastTouch.set(st.id, { ts: s.ts, status: st.status });
    }
    const end = this.snapshots[this.snapshots.length - 1].ts;
    const watched = [...lastTouch.entries()].filter(([, v]) => v.status !== 'done');
    if (!watched.length) return 0;
    const stalled = watched.filter(([, v]) => end - v.ts > thresholdMs);
    return stalled.length / watched.length;
  }

  /** CNF-08 — schema validity across the WHOLE series, not just the final state. */
  async schemaValidity() {
    if (!this.snapshots.length) return null;
    const tmp = path.join(process.env.TMPDIR || '/tmp', `anymake-eval-board-${process.pid}.json`);
    let ok = 0;
    for (const s of this.snapshots) {
      if (!s.valid) continue;
      fs.writeFileSync(tmp, JSON.stringify(s.state));
      // Reuse the repo's own validator rather than reimplementing the schema —
      // a second implementation would drift from TEMPLATES/board-state.schema.json.
      const passed = await new Promise((res) => {
        execFile(process.execPath, [path.join(REPO_ROOT, '.opencode', 'validate-board-state.mjs'), tmp],
          (err) => res(!err));
      });
      if (passed) ok++;
    }
    try { fs.unlinkSync(tmp); } catch {}
    return ok / this.snapshots.length;
  }

  /** The run timeline the cell drill-down renders (§8.1 view 11). */
  timeline() {
    if (!this.snapshots.length) return [];
    const t0 = this.snapshots[0].ts;
    const phases = [];
    let current = null;
    for (const s of this.snapshots) {
      const phase = s.state?.phase ?? null;
      if (phase !== current?.phase) {
        if (current) current.end = s.ts;
        current = { phase, start: s.ts, end: s.ts };
        phases.push(current);
      } else current.end = s.ts;
    }
    const min = (ms) => Math.round((ms - t0) / 60000);
    return phases.filter((p) => p.phase != null).map((p) => ({
      label: `Phase ${p.phase}`,
      start: min(p.start), end: Math.max(min(p.end), min(p.start) + 1),
    }));
  }
}

export function findProjectDir(arenaDir) {
  const base = path.join(arenaDir, 'mission-control', 'PROJECTS');
  if (!exists(base)) return null;
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory());
  return dirs.length ? path.join(base, dirs[0].name) : null;
}

export { readJSON };
