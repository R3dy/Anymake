// Oracles — §3.7, run from OUTSIDE the arena against the arena's final tree.
//
// The isolation rule is the whole point (§3.2 rule 2): hidden tests, ground-truth
// maps and probe scripts live under evals/fixtures/<id>/oracle/ and the run can
// neither read, edit, nor accidentally satisfy what it cannot see.
//
// And the corollary that governs this file: the harness NEVER scores a run using
// that run's own verdicts. A Validator PASS is evidence about the system's judgment,
// scored against the oracle — never a substitute for it.
import path from 'path';
import { pathToFileURL } from 'url';
import { exists, log } from '../lib/util.mjs';

/**
 * An oracle module default-exports:
 *   async ({ productRepo, projectDir, arenaDir, fixture, scenario }) => {
 *     regression: [{ id, passed, wasGreenBefore }],
 *     repro:      [{ id, passed, wentRedToGreen }],
 *     experience: [{ id, story, passed, mode, evidence }],
 *     acceptance: [{ id, statement, satisfied, evidence }],
 *     buildable:  boolean,
 *     userObservableStories: [storyId],
 *     invariants: [{ id, held }],
 *     adrs:       [{ id, respected }],
 *     neverBuildingBuilt: boolean
 *   }
 * Anything it omits is reported as unmeasured, not as zero.
 */
export async function runOracle({ oracleDir, productRepo, projectDir, arenaDir, fixture, scenario }) {
  const entry = path.join(oracleDir || '', 'index.mjs');
  if (!oracleDir || !exists(entry)) {
    return { available: false, note: `no oracle at ${oracleDir || '(none)'} — Outcome metrics unscored, not zeroed` };
  }
  try {
    const mod = await import(pathToFileURL(entry).href);
    const raw = await mod.default({ productRepo, projectDir, arenaDir, fixture, scenario });
    return normalizeOracle(raw);
  } catch (e) {
    log.error('oracle failed:', e.message);
    // A broken oracle is a harness fault (REL-01), never a failing grade for the run.
    return { available: false, error: String(e.message || e), note: 'oracle crashed — cell excluded from Outcome scoring' };
  }
}

export function normalizeOracle(raw = {}) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const o = {
    available: true,
    regression: arr(raw.regression),
    repro: arr(raw.repro),
    experience: arr(raw.experience),
    acceptance: arr(raw.acceptance),
    invariants: arr(raw.invariants),
    adrs: arr(raw.adrs),
    buildable: raw.buildable ?? null,
    userObservableStories: arr(raw.userObservableStories),
    neverBuildingBuilt: raw.neverBuildingBuilt ?? null,
    notes: raw.notes || null,
  };
  const rate = (xs) => (xs.length ? xs.filter((x) => x.passed ?? x.satisfied ?? x.held ?? x.respected).length / xs.length : null);
  o.rates = {
    // OUT-02 pools the acceptance/repro suites — "did the thing the brief asked for work".
    oracle: rate([...o.acceptance, ...o.repro]),
    experience: rate(o.experience),          // OUT-03
    regression: o.regression.length
      ? o.regression.filter((r) => r.wasGreenBefore && !r.passed).length / o.regression.length
      : null,                                 // OUT-05, as a rate of NEW breakage
    invariants: rate(o.invariants),           // FID-05
    adrs: rate(o.adrs),                       // FID-04 mechanical half
    acceptance: rate(o.acceptance),           // FID-03
  };
  return o;
}

/**
 * OUT-04, the headline: claimed-done stories that fail the oracle.
 * Computed per story, not per run, so the report can name *which* story the system
 * was wrong about — a rate alone is not actionable.
 */
export function trustGap(doneStories, oracle) {
  if (!oracle.available || !doneStories.length) return { value: null, note: 'no oracle or no claimed-done stories' };
  const byStory = new Map();
  for (const e of [...oracle.experience, ...oracle.acceptance]) {
    if (e.story == null) continue;
    const k = String(e.story);
    byStory.set(k, (byStory.get(k) ?? true) && !!(e.passed ?? e.satisfied));
  }
  // If no oracle result binds to a board story id, the gap is UNKNOWN, not zero.
  // Reporting "0 gaps" from an unbound oracle would be the exact dishonesty this
  // metric exists to catch, pointed the other way.
  const bound = doneStories.filter((s) => byStory.has(String(s.id)));
  if (!bound.length) {
    return { value: null, note: `oracle results could not be bound to board story ids `
      + `(board: ${doneStories.map((s) => s.id).slice(0, 5).join(', ')}; oracle: ${[...byStory.keys()].slice(0, 5).join(', ')})` };
  }

  const gaps = bound.filter((s) => byStory.get(String(s.id)) === false);
  return {
    value: gaps.length / bound.length,
    evidence: {
      claimed: bound.length,
      verified: bound.length - gaps.length,
      unbound: doneStories.length - bound.length,
      gapStories: gaps.map((s) => ({
        id: s.id, title: s.title || '',
        why: failureReason(String(s.id), oracle),
      })),
    },
  };
}

const failureReason = (storyId, oracle) => {
  const fails = [...oracle.experience, ...oracle.acceptance]
    .filter((e) => String(e.story) === storyId && !(e.passed ?? e.satisfied));
  return fails.map((f) => f.evidence || f.statement || f.id).filter(Boolean).join('; ') || 'oracle failed without detail';
};

/**
 * CNF-04 / CNF-05 — the experience gate, checked against the oracle rather than
 * against itself. A story whose §3a was waived as N/A while the oracle shows the
 * behavior is user-observable is waiver abuse, and it is the gate's failure, not
 * the story's.
 */
export function experienceGateIntegrity(reports, oracle) {
  const observable = new Set(oracle.userObservableStories.map(String));
  const entries = reports.all();
  if (!entries.length) return { integrity: { value: null, note: 'no experience reports' }, abuse: { value: null } };
  let clean = 0, abused = 0;
  const abusedStories = [];
  for (const r of entries) {
    const isNA = r.verdict === 'N/A';
    if (!isNA) { if (r.verdict === 'PASS' || r.justified) clean++; continue; }
    if (observable.has(String(r.story))) { abused++; abusedStories.push(r.story); }
    else if (r.justification) clean++;
    else abusedStories.push(r.story); // an unjustified N/A is not clean either (gate honesty rule)
  }
  return {
    integrity: { value: clean / entries.length, evidence: { clean, of: entries.length } },
    abuse: { value: abused / entries.length, evidence: { abused, of: entries.length, stories: abusedStories } },
  };
}
