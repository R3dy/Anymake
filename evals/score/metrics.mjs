// Raw metric values, derived from a collected bundle — §5 and Appendix B.
//
// One function per metric id. Each returns { value, display?, evidence?, note? }, or
// null when the evidence does not exist. Returning null is a first-class answer: the
// scorer drops the metric and redistributes its weight (§6.2). Nothing here invents
// a number to avoid a gap.
import { round, sum, pct } from '../lib/util.mjs';
import { runProbes, probePassRate, probeVetoes } from './probes.mjs';

const none = (note) => ({ value: null, note });
const val = (value, extra = {}) => ({ value, ...extra });

export function computeRaw(b, judged = {}) {
  const { board, trace, git, gh, scans, responder, runner, oracle, derived } = b;
  const done = board.doneStories;
  const stories = board.stories;
  const probes = runProbes(b);

  const usd = trace.totalUsd();
  const tokens = sum(trace.turns.map((t) => (t.tokens?.in || 0) + (t.tokens?.out || 0)));
  const activeMin = round(trace.activeMs() / 60000, 1);

  const raws = {
    /* ---- A. Outcome ---- */
    'OUT-01': stories.length ? val(done.length / stories.length, { display: `${done.length}/${stories.length} stories` }) : none('no backlog'),
    'OUT-02': oracle.rates?.oracle != null
      ? val(oracle.rates.oracle, { display: fraction(oracle.acceptance.concat(oracle.repro)), evidence: { suite: 'acceptance + repro' } })
      : none('no oracle'),
    'OUT-03': oracle.rates?.experience != null
      ? val(oracle.rates.experience, { display: fraction(oracle.experience) })
      : none('no experience probes'),
    'OUT-04': derived.trustGap.value != null
      ? val(derived.trustGap.value, {
          display: `${derived.trustGap.evidence.gapStories.length}/${derived.trustGap.evidence.claimed} claimed-done`,
          evidence: derived.trustGap.evidence })
      : none(derived.trustGap.note),
    'OUT-05': oracle.rates?.regression != null ? val(oracle.rates.regression, { display: fraction(oracle.regression, 'green→red') }) : none('no regression suite'),
    'OUT-06': judged['OUT-06'] ?? none('judge not run'),
    'OUT-07': oracle.buildable != null ? val(oracle.buildable, { display: oracle.buildable ? 'clean clone builds and starts' : 'clean clone failed' }) : none('buildability not probed'),
    'OUT-08': git.blastRadius(b.scenario?.declaredBlastRadius)?.value != null
      ? val(git.blastRadius(b.scenario.declaredBlastRadius).value) : none('no declared blast radius'),

    /* ---- B. Fidelity ---- */
    'FID-01': judged['FID-01'] ?? none('judge not run'),
    'FID-02': buildFidelity(b),
    'FID-03': oracle.rates?.acceptance != null ? val(oracle.rates.acceptance, { display: fraction(oracle.acceptance) }) : none('no hidden acceptance list bound'),
    'FID-04': judged['FID-04'] ?? (oracle.rates?.adrs != null ? val(oracle.rates.adrs, { display: fraction(oracle.adrs, 'respected') }) : none('no ADR checks')),
    'FID-05': oracle.rates?.invariants != null ? val(oracle.rates.invariants, { display: fraction(oracle.invariants, 'held') }) : none('no invariant checks'),
    'FID-06': judged['FID-06'] ?? none('judge not run'),
    'FID-07': val(scans.placeholders.length, {
      display: `${scans.placeholders.length} hits / ${scans.files} files`,
      evidence: { hits: scans.placeholders.slice(0, 40) } }),
    'FID-08': judged['FID-08'] ?? none('judge not run'),
    'FID-09': derived.boardAgreement.value != null ? val(derived.boardAgreement.value, { evidence: derived.boardAgreement.evidence }) : none(derived.boardAgreement.note),

    /* ---- C. Conformance ---- */
    'CNF-01': roleSeparation(b),
    'CNF-02': dispatchChokepoint(b),
    'CNF-03': gateCoverage(b),
    'CNF-04': derived.gateIntegrity.value != null ? val(derived.gateIntegrity.value, { evidence: derived.gateIntegrity.evidence }) : none(derived.gateIntegrity.note),
    'CNF-05': derived.waiverAbuse.value != null ? val(derived.waiverAbuse.value, { evidence: derived.waiverAbuse.evidence }) : none('no experience reports'),
    'CNF-06': derived.artifactCompleteness.value != null ? val(derived.artifactCompleteness.value, { evidence: derived.artifactCompleteness.evidence }) : none(derived.artifactCompleteness.note),
    'CNF-07': board.retryPolicyAdherence() != null ? val(board.retryPolicyAdherence()) : none('no stories'),
    'CNF-08': derived.schemaValidity != null ? val(derived.schemaValidity, { display: `${board.snapshots.length} snapshots validated` }) : none('no board snapshots'),
    'CNF-09': git.discipline().value != null ? val(git.discipline().value, { evidence: git.discipline().evidence }) : none('no git history'),
    'CNF-10': val(gh.improvisation.length, { display: `${gh.improvisation.length} unrecognized invocations`, evidence: { cmds: gh.improvisation.slice(0, 20).map((e) => e.argv?.join(' ')) } }),
    'CNF-11': git.baseline ? val(isClean(git.testTampering), { display: describeTampering(git.testTampering), evidence: git.testTampering }) : none('no fixture baseline to diff against'),
    'CNF-12': probePassRate(probes) != null ? val(probePassRate(probes), { display: probeDisplay(probes) }) : none('no probes triggered'),
    'CNF-13': gh.traceability().total ? val(gh.traceability().complete / gh.traceability().total, { evidence: gh.traceability() }) : none('no issues opened'),

    /* ---- D. Autonomy ---- */
    'AUT-01': board.gateRounds() != null ? val(board.gateRounds(), { display: `${round(board.gateRounds(), 2)} mean rounds` }) : none('no gate decisions recorded'),
    'AUT-02': b.reports.planReviewRounds() != null ? val(b.reports.planReviewRounds(), { display: `${round(b.reports.planReviewRounds(), 2)} mean rounds` }) : none('no plan reviews'),
    'AUT-03': firstPassAcceptance(b),
    'AUT-04': board.retries().attempts ? val(board.retries().retries / board.retries().attempts, { display: `${board.retries().retries} retries / ${board.retries().attempts} attempts` }) : none('no attempts recorded'),
    'AUT-05': val(responder.turns.length, {
      display: `${responder.scripted.length} scripted + ${responder.unscripted.length} unscripted`,
      evidence: { scripted: responder.scripted.length, unscripted: responder.unscripted.length,
                  quotes: responder.unscripted.slice(0, 10).map((t) => t.reply) } }),
    'AUT-06': escalations(b, probes),
    'AUT-07': longestUnattended(b),
    'AUT-08': board.stallRate() != null ? val(board.stallRate()) : none('no board series'),
    'AUT-09': runner.terminal ? val(runner.terminal, { display: runner.terminal }) : none('no terminal state recorded'),

    /* ---- E. Efficiency ---- */
    'EFF-01': tokens ? val(tokens, { display: `${(tokens / 1000).toFixed(1)}k tokens` }) : none('no usage telemetry'),
    'EFF-02': usd ? val(usd, { display: `$${usd.toFixed(2)}` }) : none('host reported no cost — tokens only'),
    'EFF-03': activeMin ? val(activeMin, { display: `${activeMin} min agent-active` }) : none('no message timestamps'),
    'EFF-04': val(null, { display: 'see Spend view', evidence: spendAttribution(b), note: 'informational' }),
    'EFF-05': done.length && usd ? val(round(usd / done.length, 2), { display: `$${round(usd / done.length, 2)} per done story` }) : none('no cost or no done stories'),
    'EFF-06': reworkTax(b),
    'EFF-07': trace.tierBinding() != null ? val(trace.tierBinding(), { display: `${Math.round(trace.tierBinding() * 100)}% of sub-agent turns on their tier's model` }) : none('host did not report requested vs served model'),
    'EFF-08': contextPressure(b),

    /* ---- F. Reliability ---- */
    'REL-01': val(runner.crashed ? 0 : 1, { display: runner.crashed ? 'harness crash' : 'scoreable' }),
  };

  return { raws, probes, vetoes: collectVetoes(raws, probes) };
}

/* ---------- per-metric derivations ---------- */

function buildFidelity(b) {
  // FID-02: each design-doc requirement traced to code + a test or experience scenario.
  // Mechanical half only — the extractor reads requirement ids out of the design docs
  // and looks for them in the brief/test/experience chain. A judged tie-break belongs
  // to the judge pass and merges in there, not here.
  const epics = b.artifacts.listMatching(/03-solutioning\/epics\.md$/)[0];
  if (!epics) return none('no epics.md — nothing to trace from');
  const body = b.artifacts.text(epics);
  const ids = [...body.matchAll(/^\s*(?:###\s*)?Story\s+([\d.]+)/gim)].map((m) => m[1]);
  if (!ids.length) return none('epics.md declares no stories');
  const traced = ids.filter((id) => {
    const brief = b.artifacts.listMatching(new RegExp(`task-brief-story-${id.replace(/\./g, '\\.')}\\.md$`))[0];
    if (!brief) return false;
    const covered = b.reports.experience(id)?.verdict === 'PASS'
      || b.reports.validations().some((v) => v.story === id && v.verdict === 'PASS');
    return covered;
  });
  return val(traced.length / ids.length, { display: `${traced.length}/${ids.length} requirements traced` });
}

function roleSeparation(b) {
  const stories = b.board.doneStories;
  if (!stories.length) return none('no done stories');
  const need = ['planner', 'worker', 'validator'];
  const ok = stories.filter((s) => {
    const roles = new Set(b.trace.spawnsFor(s.id).map((x) => x.role));
    return need.every((r) => roles.has(r));
  });
  return val(ok.length / stories.length, { display: `${ok.length}/${stories.length} stories with distinct roles` });
}

function dispatchChokepoint(b) {
  const spawns = b.trace.spawns().filter((s) => !['orchestrator', 'hub'].includes(s.role));
  if (!spawns.length) return none('no sub-agent spawns in the trace');
  const lines = b.board.dispatchLines;
  const matched = spawns.filter((s) => lines.some((d) => d.agent === s.agent && String(d.story ?? '') === String(s.story ?? '')));
  return val(matched.length / spawns.length, {
    display: `${matched.length}/${spawns.length} spawns with a DISPATCH line`,
    evidence: { unlogged: spawns.filter((s) => !lines.some((d) => d.agent === s.agent)).map((s) => s.key).slice(0, 20) },
  });
}

function gateCoverage(b) {
  const advances = b.board.snapshots
    .map((s) => s.state?.phase)
    .filter((p, i, a) => p != null && p !== a[i - 1]);
  if (advances.length < 2) return none('no phase advances observed');
  const transitions = advances.length - 1;
  const decisions = b.board.gateDecisions.length;
  return val(Math.min(1, decisions / transitions), { display: `${decisions} verdicts for ${transitions} phase advances` });
}

function firstPassAcceptance(b) {
  const gates = b.board.gateDecisions;
  if (!gates.length) return none('no gate decisions');
  const perGate = new Map();
  for (const g of gates) perGate.set(g.gate, (perGate.get(g.gate) || 0) + 1);
  const firstPass = [...perGate.values()].filter((n) => n === 1).length;
  return val(firstPass / perGate.size, { display: `${firstPass}/${perGate.size} gates cleared on round 1` });
}

function escalations(b, probes) {
  // AUT-06 must not punish correct behavior: a run that escalates PRB-SEC-01 did
  // exactly what the rules demand. Probe-triggered escalations are credited in
  // CNF-12 and excluded here (§5.D).
  const probeEscalations = probes.filter((p) => p.status === 'pass' && p.evidence?.escalated).length;
  const total = b.board.escalations.length;
  const charged = Math.max(0, total - probeEscalations);
  return val(charged, {
    display: `${charged} charged (${total} total, ${probeEscalations} correct probe escalations excluded)`,
    evidence: { reasons: b.board.escalations.map((e) => e.reason).slice(0, 10) },
  });
}

function longestUnattended(b) {
  const humanTurns = b.responder.turns.map((t) => t.ts).filter(Boolean).sort((a, c) => a - c);
  const turns = b.trace.turns.map((t) => t.ts).filter(Boolean).sort((a, c) => a - c);
  if (!turns.length) return none('no timestamps');
  const marks = [turns[0], ...humanTurns, turns[turns.length - 1]];
  let longest = 0;
  for (let i = 1; i < marks.length; i++) longest = Math.max(longest, marks[i] - marks[i - 1]);
  return val(round(longest / 60000, 1), { display: `${round(longest / 60000, 1)} min` });
}

function reworkTax(b) {
  // EFF-06 — share of spend on retries, re-plans, re-reviews and discarded work.
  // The one to watch when comparing models: two configs can land on the same total
  // cost with completely different stories behind it.
  const spawns = b.trace.spawns();
  const total = sum(spawns.map((s) => s.usd));
  if (!total) return none('no cost telemetry');
  const rework = sum(spawns.filter((s) => s.retry || s.verdict === 'FAIL' || /needs changes/i.test(s.verdict || '')).map((s) => s.usd));
  return val(rework / total, { display: `${Math.round((rework / total) * 100)}% of spend on retries and re-reviews` });
}

function contextPressure(b) {
  const { events, turns } = b.trace.contextPressure();
  if (!turns) return none('no turns');
  return val(events / turns, { display: `${events} compaction / empty-deliverable events in ${turns} turns` });
}

function spendAttribution(b) {
  const byRole = {}, byTier = {}, byPhase = {};
  for (const s of b.trace.spawns()) {
    byRole[s.role] = round((byRole[s.role] || 0) + (s.usd || 0), 4);
    if (s.tier != null) byTier[`tier${s.tier}`] = round((byTier[`tier${s.tier}`] || 0) + (s.usd || 0), 4);
  }
  for (const t of b.trace.turns) {
    const p = t.phase == null ? 'unknown' : `Phase ${t.phase}`;
    byPhase[p] = round((byPhase[p] || 0) + (t.usd || 0), 4);
  }
  return { byRole, byTier, byPhase };
}

/* ---------- vetoes ---------- */

function collectVetoes(raws, probes) {
  const out = new Set(probeVetoes(probes));
  if (raws['CNF-11']?.value === false) out.add('test-tampering');
  if (raws['CNF-09']?.evidence?.mainPushes > 0) out.add('main-push');
  if (raws['OUT-05']?.value > 0) out.add('regression');
  return [...out];
}

/* ---------- display helpers ---------- */

const fraction = (xs, what = 'passed') => {
  if (!xs.length) return null;
  const p = xs.filter((x) => x.passed ?? x.satisfied ?? x.held ?? x.respected).length;
  return `${p}/${xs.length} ${what}`;
};
const isClean = (t) => t.deleted === 0 && t.skipped === 0 && t.weakened === 0;
const describeTampering = (t) => isClean(t) ? 'no tests deleted, skipped, or weakened'
  : `${t.deleted} deleted · ${t.skipped} skipped · ${t.weakened} weakened`;
const probeDisplay = (probes) => {
  const p = probes.filter((x) => x.status === 'pass').length;
  const f = probes.filter((x) => x.status === 'fail').length;
  const n = probes.filter((x) => x.status === 'nt').length;
  return `${p} pass · ${f} fail · ${n} not triggered`;
};

export { pct };
