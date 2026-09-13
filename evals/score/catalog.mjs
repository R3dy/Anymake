// The metric catalog — §5 of docs/design/eval-harness.md, as data.
//
// Every metric declares: id, pillar, source (which collector), normalizer,
// applies_when, and whether it is mechanical or judged. Nothing here computes
// anything; raw values come from score/metrics.mjs, normalization from
// score/normalize.mjs. Keeping the three apart is what makes §8.2's derivation
// table possible — raw → normalizer → score → weight → contribution, all visible.
//
// `applies` receives a cell context:
//   { class: 'S1'|'S2'|'S3'|'S4'|'S5'|'S0', type, anymake, tiered, uiType, repeats }

export const PILLARS = [
  { id: 'A', key: 'outcome', label: 'Outcome' },
  { id: 'B', key: 'fidelity', label: 'Fidelity' },
  { id: 'C', key: 'conformance', label: 'Conformance' },
  { id: 'D', key: 'autonomy', label: 'Autonomy' },
  { id: 'E', key: 'efficiency', label: 'Efficiency' },
  { id: 'F', key: 'reliability', label: 'Reliability' }, // reported, never composited
];

const ALL = () => true;
const anymakeOnly = (c) => c.anymake;
const greenfield = (c) => c.class === 'S1' || c.class === 'S2';
const agile = (c) => c.class === 'S3' || c.class === 'S4';
const fixtureBased = (c) => ['S3', 'S4', 'S5'].includes(c.class);

/**
 * weight: within-pillar weight. Pillar score is the weighted mean of its
 * *applicable* metrics; a non-applicable metric is dropped and its weight is
 * redistributed proportionally (§6.2) — never zero-filled.
 */
export const METRICS = [
  /* ---------------- A. Outcome ---------------- */
  { id: 'OUT-01', pillar: 'A', weight: 10, label: 'Backlog completion', source: 'board', normalizer: 'ratio', kind: 'mechanical', applies: ALL },
  { id: 'OUT-02', pillar: 'A', weight: 22, label: 'Oracle pass rate', source: 'oracle', normalizer: 'ratio', kind: 'mechanical', applies: ALL },
  { id: 'OUT-03', pillar: 'A', weight: 20, label: 'Experience probe pass rate', source: 'oracle', normalizer: 'ratio', kind: 'mechanical', applies: ALL },
  { id: 'OUT-04', pillar: 'A', weight: 22, label: 'Trust gap', source: 'board × oracle', normalizer: 'inverted rate', kind: 'mechanical', applies: ALL, headline: true },
  { id: 'OUT-05', pillar: 'A', weight: 10, label: 'Regression rate', source: 'oracle', normalizer: 'inverted rate', kind: 'mechanical', applies: fixtureBased, veto: 'regression' },
  { id: 'OUT-06', pillar: 'A', weight: 6, label: 'Root-cause correctness', source: 'judge', normalizer: 'rubric', kind: 'judged', applies: (c) => c.class === 'S3' },
  { id: 'OUT-07', pillar: 'A', weight: 6, label: 'Buildability', source: 'oracle', normalizer: 'binary', kind: 'mechanical', applies: ALL },
  { id: 'OUT-08', pillar: 'A', weight: 4, label: 'Blast radius ratio', source: 'git × plan', normalizer: 'band', params: { target: 1, tolerance: 0.25, zero_at: 3 }, kind: 'mechanical', applies: agile },

  /* ---------------- B. Fidelity ---------------- */
  { id: 'FID-01', pillar: 'B', weight: 18, label: 'Planning fidelity', source: 'judge', normalizer: 'ratio', kind: 'judged', applies: ALL },
  { id: 'FID-02', pillar: 'B', weight: 18, label: 'Build fidelity', source: 'extractor + trace', normalizer: 'ratio', kind: 'mechanical', applies: ALL },
  { id: 'FID-03', pillar: 'B', weight: 20, label: 'Intent fidelity (end-to-end)', source: 'oracle', normalizer: 'ratio', kind: 'mechanical', applies: ALL },
  { id: 'FID-04', pillar: 'B', weight: 8, label: 'ADR compliance', source: 'checks.mjs + judge', normalizer: 'ratio', kind: 'judged', applies: ALL },
  { id: 'FID-05', pillar: 'B', weight: 8, label: 'Invariant compliance', source: 'checks.mjs', normalizer: 'ratio', kind: 'mechanical', applies: fixtureBased },
  { id: 'FID-06', pillar: 'B', weight: 6, label: 'Scope inflation', source: 'judge + git', normalizer: 'inverted rate', kind: 'judged', applies: ALL },
  { id: 'FID-07', pillar: 'B', weight: 12, label: 'Placeholder / stub density', source: 'scan', normalizer: 'inverted density', params: { cap: 25 }, kind: 'mechanical', applies: ALL },
  { id: 'FID-08', pillar: 'B', weight: 6, label: 'Design-system consistency', source: 'judge', normalizer: 'rubric', kind: 'judged', applies: (c) => c.uiType },
  { id: 'FID-09', pillar: 'B', weight: 4, label: 'Artifact–board agreement', source: 'scan', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },

  /* ---------------- C. Conformance ---------------- */
  { id: 'CNF-01', pillar: 'C', weight: 12, label: 'Role separation', source: 'trace + dispatch log', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-02', pillar: 'C', weight: 12, label: 'Dispatch chokepoint (INV-018)', source: 'trace × board', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-03', pillar: 'C', weight: 8, label: 'Gate coverage', source: 'board + PHASE_STATE', normalizer: 'ratio', kind: 'mechanical', applies: (c) => c.anymake && greenfield(c) },
  { id: 'CNF-04', pillar: 'C', weight: 8, label: 'Experience-gate integrity', source: 'reports × oracle', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-05', pillar: 'C', weight: 10, label: 'Waiver abuse', source: 'reports × oracle', normalizer: 'inverted rate', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-06', pillar: 'C', weight: 8, label: 'Artifact completeness', source: 'scan', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-07', pillar: 'C', weight: 6, label: 'Retry-policy adherence', source: 'board', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-08', pillar: 'C', weight: 6, label: 'Board-state schema validity', source: 'board × validator', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-09', pillar: 'C', weight: 8, label: 'Git discipline', source: 'git', normalizer: 'ratio', kind: 'mechanical', applies: ALL, veto: 'main-push' },
  { id: 'CNF-10', pillar: 'C', weight: 4, label: 'Tooling improvisation', source: 'shim ledger', normalizer: 'inverted density', params: { cap: 12 }, kind: 'mechanical', applies: ALL },
  { id: 'CNF-11', pillar: 'C', weight: 8, label: 'Test integrity', source: 'git diff', normalizer: 'binary', kind: 'mechanical', applies: fixtureBased, veto: 'test-tampering' },
  { id: 'CNF-12', pillar: 'C', weight: 12, label: 'Invariant probe pass rate', source: 'probes', normalizer: 'ratio', kind: 'mechanical', applies: anymakeOnly },
  { id: 'CNF-13', pillar: 'C', weight: 6, label: 'Traceability completeness', source: 'gh ledger', normalizer: 'ratio', kind: 'mechanical', applies: agile },

  /* ---------------- D. Autonomy & human load ---------------- */
  { id: 'AUT-01', pillar: 'D', weight: 16, label: 'Gate rounds to approval', source: 'board', normalizer: 'band', params: { target: 1, tolerance: 0.4, zero_at: 3 }, kind: 'mechanical', applies: (c) => c.anymake && greenfield(c) },
  { id: 'AUT-02', pillar: 'D', weight: 14, label: 'Plan review rounds', source: 'reports', normalizer: 'band', params: { target: 1, tolerance: 0.4, zero_at: 3 }, kind: 'mechanical', applies: (c) => c.anymake && agile(c) },
  { id: 'AUT-03', pillar: 'D', weight: 12, label: 'First-pass acceptance rate', source: 'derived', normalizer: 'ratio', kind: 'mechanical', applies: (c) => c.anymake && c.class !== 'S5' },
  { id: 'AUT-04', pillar: 'D', weight: 12, label: 'Build retries', source: 'board', normalizer: 'inverted rate', kind: 'mechanical', applies: anymakeOnly },
  { id: 'AUT-05', pillar: 'D', weight: 14, label: 'Human turns required', source: 'responder log', normalizer: 'band', params: { target: 0, tolerance: 2, zero_at: 20 }, kind: 'mechanical', applies: (c) => c.class !== 'S1' },
  { id: 'AUT-06', pillar: 'D', weight: 10, label: 'Escalations to the real user', source: 'board', normalizer: 'band', params: { target: 0, tolerance: 1, zero_at: 8 }, kind: 'mechanical', applies: ALL },
  { id: 'AUT-07', pillar: 'D', weight: 8, label: 'Longest unattended stretch', source: 'derived', normalizer: 'band', params: { target: 60, tolerance: 60, zero_at: 5 }, kind: 'mechanical', applies: (c) => c.class !== 'S1' },
  { id: 'AUT-08', pillar: 'D', weight: 8, label: 'Stall rate', source: 'board', normalizer: 'inverted rate', kind: 'mechanical', applies: ALL },
  { id: 'AUT-09', pillar: 'D', weight: 6, label: 'Terminal outcome', source: 'runner', normalizer: 'categorical', params: { map: { complete: 100, escalated: 70, capped: 30, crashed: 0 } }, kind: 'mechanical', applies: ALL },

  /* ---------------- E. Efficiency ---------------- */
  { id: 'EFF-01', pillar: 'E', weight: 16, label: 'Total tokens', source: 'usage', normalizer: 'band', kind: 'mechanical', applies: ALL, budgetKey: 'tokens' },
  { id: 'EFF-02', pillar: 'E', weight: 22, label: 'Total USD', source: 'usage', normalizer: 'band', kind: 'mechanical', applies: ALL, budgetKey: 'usd' },
  { id: 'EFF-03', pillar: 'E', weight: 14, label: 'Agent-active time', source: 'usage', normalizer: 'band', kind: 'mechanical', applies: ALL, budgetKey: 'minutes' },
  { id: 'EFF-04', pillar: 'E', weight: 0, label: 'Spend attribution', source: 'usage × dispatch', normalizer: 'ratio', kind: 'mechanical', applies: ALL, informational: true },
  { id: 'EFF-05', pillar: 'E', weight: 14, label: 'Unit economics ($/done story)', source: 'derived', normalizer: 'band', kind: 'mechanical', applies: ALL, budgetKey: 'usd_per_story' },
  { id: 'EFF-06', pillar: 'E', weight: 18, label: 'Rework tax', source: 'usage × board', normalizer: 'inverted rate', kind: 'mechanical', applies: ALL },
  { id: 'EFF-07', pillar: 'E', weight: 8, label: 'Tier binding effectiveness', source: 'usage', normalizer: 'ratio', kind: 'mechanical', applies: (c) => c.tiered },
  { id: 'EFF-08', pillar: 'E', weight: 8, label: 'Context pressure', source: 'trace + dispatch', normalizer: 'inverted rate', kind: 'mechanical', applies: anymakeOnly },

  /* ---------------- F. Reliability (reported, not composited) ---------------- */
  { id: 'REL-01', pillar: 'F', weight: 0, label: 'Harness completion rate', source: 'runner', normalizer: 'ratio', kind: 'mechanical', applies: ALL, informational: true },
  { id: 'REL-02', pillar: 'F', weight: 0, label: 'Score dispersion across repeats', source: 'derived', normalizer: 'ratio', kind: 'mechanical', applies: (c) => c.repeats >= 3, informational: true },
  { id: 'REL-03', pillar: 'F', weight: 0, label: 'Failure-mode stability', source: 'derived', normalizer: 'ratio', kind: 'mechanical', applies: (c) => c.repeats >= 3, informational: true },
  { id: 'REL-04', pillar: 'F', weight: 0, label: 'Judge agreement', source: 'judges', normalizer: 'ratio', kind: 'mechanical', applies: ALL, informational: true },
];

export const byId = Object.fromEntries(METRICS.map((m) => [m.id, m]));

export const metricsForPillar = (pillarId) =>
  METRICS.filter((m) => m.pillar === pillarId && !m.informational);

/** Metrics that apply to this cell, after the type's Eval Profile skip-list (§6.3). */
export function applicableMetrics(pillarId, ctx, profile = {}) {
  const skip = new Set(profile.skip || []);
  return metricsForPillar(pillarId).filter((m) => !skip.has(m.id) && m.applies(ctx));
}
