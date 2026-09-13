// Trace capture and reassembly — §7.1, §7.2.
//
// One collector, because everything in §7 derives from it: the dispatch tree, input
// composition, instruction attention, defect attribution. Capturing it in full from
// day one costs nothing extra and is not recoverable later.
//
// Degradation is explicit, never silent (§7.1): a field the host does not expose is
// recorded as absent and the report says which fields this run captured. Reasoning
// is NEVER inferred from message text and presented as reasoning.
import path from 'path';
import { readJSONL, sum, groupBy, round } from '../lib/util.mjs';

const ROLE_FROM_AGENT = {
  'anymake-planner': 'planner',
  'anymake-worker': 'worker',
  'anymake-validator': 'validator',
  'anymake-experience-runner': 'experience-runner',
  'anymake-orchestrator': 'orchestrator',
  'anymake-product-owner-proxy': 'proxy',
  'anymake-plan-reviewer': 'plan-reviewer',
  'anymake-solution-architect': 'solution-architect',
  'anymake-cartographer': 'cartographer',
};

/** Which of §7.1's fields this run actually captured. Stamped into the report header. */
export function capturedFields(turns) {
  const has = (k) => turns.some((t) => t[k] != null && (!Array.isArray(t[k]) || t[k].length));
  return {
    tokens: has('tokens'), usd: turns.some((t) => t.usd != null),
    reasoning: has('reasoning'), tool_calls: has('tool_calls'),
    files_read: has('files_read'), skills_invoked: has('skills_invoked'),
    model_served: has('model_served'),
  };
}

/** anymake-system · project-artifact · source · other — the split §7.7 rests on. */
export function classifyRead(p) {
  if (!p) return 'other';
  const n = p.replace(/\\/g, '/');
  if (/(^|\/)(AGENTS|PHASE_GUIDES|TEMPLATES|skills|PROJECT_TYPES)(\/|$)/.test(n) || /(^|\/)AGENTS\.md$/.test(n))
    return 'anymake-system';
  if (/(^|\/)PROJECTS\//.test(n) || /(^|\/)\.anymake\//.test(n)) return 'project-artifact';
  if (/\.(m?[jt]sx?|py|go|rb|rs|java|css|html|sql)$/.test(n)) return 'source';
  return 'other';
}

/** The system-file path as it exists in the pinned checkout, for attention accounting. */
export function systemFileKey(p) {
  const n = (p || '').replace(/\\/g, '/');
  const i = n.search(/(AGENTS\.md$|AGENTS\/|PHASE_GUIDES\/|TEMPLATES\/|skills\/|PROJECT_TYPES\/)/);
  return i >= 0 ? n.slice(i) : null;
}

export class Trace {
  constructor(turns) {
    this.turns = turns;
    this.captured = capturedFields(turns);
  }

  static load(cellDir) {
    const turns = readJSONL(path.join(cellDir, 'telemetry', 'trace.jsonl'));
    return new Trace(turns.map((t) => ({ ...t, role: t.role || ROLE_FROM_AGENT[t.agent] || t.agent })));
  }

  /** One node per (agent, story, attempt) — the dispatch tree of §7.2. */
  spawns() {
    const key = (t) => `${t.agent}|${t.story ?? ''}|${t.attempt ?? 1}`;
    const out = [];
    for (const [k, ts] of groupBy(this.turns.filter((t) => t.role !== 'hub'), key)) {
      const first = ts[0];
      out.push({
        key: k, agent: first.agent, role: first.role, tier: first.tier ?? null,
        story: first.story ?? null, attempt: first.attempt ?? 1,
        model_requested: first.model_requested ?? null,
        model_served: first.model_served ?? null,
        tin: sum(ts.map((t) => t.tokens?.in)), tout: sum(ts.map((t) => t.tokens?.out)),
        cacheRead: sum(ts.map((t) => t.tokens?.cache_read)),
        usd: round(sum(ts.map((t) => t.usd)), 4),
        durationMs: sum(ts.map((t) => t.duration_ms)),
        artifact: ts.map((t) => t.artifact_written).filter(Boolean).pop() || null,
        verdict: ts.map((t) => t.verdict_emitted).filter(Boolean).pop() || null,
        retry: (first.attempt ?? 1) > 1,
        turns: ts,
      });
    }
    return out;
  }

  spawnsFor(storyId) { return this.spawns().filter((s) => String(s.story) === String(storyId)); }

  /**
   * §7.2 input composition: role prompt · task brief · chosen reads · retry context ·
   * carried conversation, per agent run. Mechanically derivable by matching reads
   * against the pinned checkout, which is what turns "is AGENTS.md too big?" into a
   * line item instead of an opinion.
   */
  composition(spawn) {
    const buckets = new Map();
    const add = (k, n) => buckets.set(k, (buckets.get(k) || 0) + (n || 0));
    for (const t of spawn.turns) {
      for (const c of t.input_composition || []) add(c.label, c.tokens);
      if (!t.input_composition) {
        for (const f of t.files_read || []) add(`${classifyRead(f.path)} · ${f.path}`, f.tokens || 0);
      }
    }
    return [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  }

  /** Every file read, with tokens, keyed by the system-file path. Feeds §7.6. */
  systemReads() {
    const out = [];
    for (const t of this.turns) {
      for (const f of t.files_read || []) {
        const key = systemFileKey(f.path);
        if (key) out.push({ file: key, role: t.role, agent: t.agent, tokens: f.tokens || 0, story: t.story ?? null });
      }
    }
    return out;
  }

  totalInputTokens() { return sum(this.turns.map((t) => t.tokens?.in)); }
  totalUsd() { return round(sum(this.turns.map((t) => t.usd)), 4); }
  activeMs() { return sum(this.turns.map((t) => t.duration_ms)); }

  skillsInvoked() {
    const m = new Map();
    for (const t of this.turns) for (const s of t.skills_invoked || []) m.set(s, (m.get(s) || 0) + 1);
    return m;
  }

  /** EFF-08 — compactions and empty-deliverable dispatch failures. */
  contextPressure() {
    const events = this.turns.filter((t) => t.compaction || t.empty_deliverable);
    return { events: events.length, turns: this.turns.length };
  }

  /** EFF-07 — fraction of sub-agent turns that ran on the model their tier asked for. */
  tierBinding() {
    const subs = this.turns.filter((t) => t.role !== 'hub' && t.model_requested && t.model_served);
    if (!subs.length) return null;
    return subs.filter((t) => t.model_served === t.model_requested).length / subs.length;
  }

  /** §7.9 ceremony ratio — process artifact tokens ÷ shipped code+test tokens. */
  ceremony() {
    const isProcess = (t) => ['planner', 'validator', 'proxy', 'orchestrator', 'plan-reviewer', 'experience-runner'].includes(t.role);
    const process = sum(this.turns.filter(isProcess).map((t) => (t.tokens?.out || 0)));
    const code = sum(this.turns.filter((t) => !isProcess(t)).map((t) => (t.tokens?.out || 0)));
    const total = process + code;
    return total ? { process: round(process / total, 3), code: round(code / total, 3) } : null;
  }

  /** §7.9 artifact read-back rate — artifacts written that no later agent ever reads. */
  readBack() {
    const written = [];
    for (const t of this.turns) if (t.artifact_written) written.push({ path: t.artifact_written, at: t.ts || 0 });
    if (!written.length) return null;
    const readsAfter = (p, at) => this.turns.some((t) =>
      (t.ts || 0) > at && (t.files_read || []).some((f) => (f.path || '').endsWith(path.basename(p))));
    const never = written.filter((w) => !readsAfter(w.path, w.at));
    return { written: written.length, never: never.length, rate: round(never.length / written.length, 3), neverRead: never.map((n) => n.path) };
  }
}
