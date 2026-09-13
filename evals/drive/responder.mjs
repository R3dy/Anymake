// The simulated product owner — §3.5.
//
// Yolo mode covers greenfield builds but not everything, and pretending otherwise
// would leave the most interesting scenarios untestable: anymake-agile's intake gate
// is explicitly the real reporter in *every* mode. A bug-fix scenario with nobody on
// the other end simply hangs.
//
// Two layers, and the split matters:
//   Layer 1, the script table — deterministic, preferred, replies drawn verbatim from
//   the arbiter's Escalation Phrase Lexicon plus the scenario's own factual answers.
//   Layer 2, the persona fallback — one LLM turn answering ONLY from the frozen
//   brief, counted (AUT-05b) and quoted in the report, because a scenario needing many
//   of them is telling you something real either way.
//
// The simulator is a confound and is controlled like one: pinned to one model across
// the entire matrix, independent of the cell's model config.
import path from 'path';
import { appendJSONL, log } from '../lib/util.mjs';

const PERSONA_SYSTEM = [
  'You are the product owner for a software project, answering an AI build system.',
  'Three rules, absolute:',
  '1. Answer ONLY what the product brief below supports. If the brief does not say, reply exactly: "I don\'t know — use your judgement and note the assumption."',
  '2. Never add scope. Never introduce a feature, integration, or requirement the brief does not contain.',
  '3. Never volunteer design or technical decisions. You are the person who wants the product, not the person building it.',
  'Keep replies under 40 words.',
].join('\n');

export class Responder {
  /**
   * @param script  [{ match: RegExp|string, reply, tag, once? }]
   * @param probes  [{ probe, after: 'phase-2-gate'|'story-3'|..., text, keyword, forbiddenPaths }]
   * @param persona { enabled, call: async ({system, brief, question}) => string, model }
   */
  constructor({ scenario, brief, script = [], probes = [], persona = {}, telemetryDir, budget = 12 }) {
    this.scenario = scenario;
    this.brief = brief;
    this.script = script.map((s) => ({ ...s, match: s.match instanceof RegExp ? s.match : new RegExp(s.match, 'i') }));
    this.probeSchedule = probes.slice();
    this.persona = persona;
    this.telemetryDir = telemetryDir;
    this.budget = budget;
    this.used = 0;
    this.fired = new Set();
  }

  get logPath() { return path.join(this.telemetryDir, 'responder.jsonl'); }

  /** Does this assistant turn need a human answer? */
  needsAnswer(text) {
    if (!text) return false;
    return /\?\s*$/.test(text.trim())
      || /(awaiting|waiting for|need(?:s)? your|please (?:confirm|approve|answer)|ESCALAT)/i.test(text);
  }

  /** Layer 1, then layer 2. Returns { reply, source, tag } or null. */
  async answer(question) {
    for (const s of this.script) {
      if (s.once && this.fired.has(s)) continue;
      if (s.match.test(question)) {
        this.fired.add(s);
        return this._log({ reply: s.reply, source: 'script', tag: s.tag || null, question });
      }
    }
    if (!this.persona?.enabled || !this.persona.call) {
      return this._log({
        reply: "I don't know — use your judgement and note the assumption.",
        source: 'persona-unavailable', tag: 'fallback-disabled', question,
      });
    }
    if (this.used >= this.budget) {
      log.warn('persona budget exhausted — the scenario script is incomplete, which is itself a finding');
      return this._log({ reply: 'No further input. Proceed with what you have.', source: 'persona-capped', question });
    }
    this.used++;
    let reply;
    try {
      reply = await this.persona.call({ system: PERSONA_SYSTEM, brief: this.brief, question });
    } catch (e) {
      reply = "I don't know — use your judgement and note the assumption.";
      log.warn('persona call failed:', e.message);
    }
    return this._log({ reply, source: 'persona', model: this.persona.model || null, question });
  }

  /**
   * Probe injections (§4.2) arrive as ordinary user turns at a scripted trigger,
   * which is exactly how they would arrive from a real person.
   */
  injectionFor(triggerKey) {
    const i = this.probeSchedule.findIndex((p) => p.after === triggerKey);
    if (i < 0) return null;
    const [probe] = this.probeSchedule.splice(i, 1);
    this._log({ reply: probe.text, source: 'probe', probe: probe.probe, tag: probe.after,
      keyword: probe.keyword, forbiddenPaths: probe.forbiddenPaths, at: Date.now() });
    return probe;
  }

  _log(entry) {
    const rec = { ts: Date.now(), ...entry };
    appendJSONL(this.logPath, rec);
    return rec;
  }
}

/** The persona layer's one LLM call, isolated so a provider change is one edit. */
export function makePersonaCaller({ model, endpoint, apiKey }) {
  if (!apiKey || !model) return null;
  return async ({ system, brief, question }) => {
    const res = await fetch(endpoint || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: 200, system,
        messages: [{ role: 'user', content: `PRODUCT BRIEF:\n${brief}\n\nThe build system asks:\n${question}` }],
      }),
    });
    if (!res.ok) throw new Error(`persona call ${res.status}`);
    const json = await res.json();
    return (json.content || []).map((c) => c.text).join('').trim();
  };
}
