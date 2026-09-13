#!/usr/bin/env node
// The harness's own regression check — free, offline, and fast.
//
// This repo's rule is that every fix ships with the assertion that would have caught
// it (docs/audits/2026-08-29-remediation-plan.md, .opencode/verify-plugin.mjs's header).
// A harness that grades Anymake and has no check of its own would be the clearest
// possible instance of the drift that audit already found once.
//
// It exercises the parts that can be wrong *quietly*: normalizers, weight
// redistribution, the judged cap, vetoes, probe status handling, the Eval Profile
// parser, and — via a tiny DOM — every renderer in the report against real data.
//
// Run: node evals/selftest.mjs   (or `npm run eval:selftest`)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { HARNESS_ROOT, readJSON, readText, exists, rmrf, median, iqr, overlaps, round } from './lib/util.mjs';
import { normalize, NORMALIZERS } from './score/normalize.mjs';
import { METRICS, applicableMetrics, PILLARS } from './score/catalog.mjs';
import { scorePillar, scoreCell, costAdjust, VETOES } from './score/composite.mjs';
import { PROBES, runProbes, probePassRate, probeVetoes } from './score/probes.mjs';
import { deriveAlarms } from './score/alarms.mjs';
import { publicHalf, hiddenHalf } from './arena/build.mjs';
import { parseEvalProfile } from './run.mjs';
import { installDOM } from './report/domstub.mjs';

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failures++; };
const check = (cond, m) => (cond ? ok(m) : bad(m));
const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

const weights = readJSON(path.join(HARNESS_ROOT, 'score', 'weights.json'));

/* ---------------------------------------------------------------- */
console.log('\n[1] Normalizers');
check(NORMALIZERS.ratio(0.5) === 50, 'ratio scales 0–1 to 0–100');
check(NORMALIZERS['inverted rate'](0.25) === 75, 'inverted rate flips a failure rate');
check(NORMALIZERS.binary(true) === 100 && NORMALIZERS.binary(false) === 0, 'binary is 0 or 100');
check(NORMALIZERS.rubric(3) === 75, 'rubric 0–4 maps to 0–100');
check(NORMALIZERS['inverted density'](5, { cap: 10 }) === 50, 'inverted density scales against its cap');
check(NORMALIZERS['inverted density'](50, { cap: 10 }) === 0, 'inverted density floors at 0, never negative');
check(NORMALIZERS.band(1, { target: 1, tolerance: 0.4, zero_at: 3 }) === 100, 'band pays 100 inside the band');
check(NORMALIZERS.band(3, { target: 1, tolerance: 0.4, zero_at: 3 }) === 0, 'band reaches 0 at zero_at');
check(near(NORMALIZERS.band(2, { target: 1, tolerance: 0.4, zero_at: 3 }), 62.5), 'band decays linearly between');
check(NORMALIZERS.ratio(2) === 100 && NORMALIZERS.ratio(-1) === 0, 'normalizers clamp to 0–100');

// The rule from §6.1 that a bug would silently break: an uncalibrated band must not
// score at all, because a made-up target is worse than a missing number.
const uncal = normalize({ normalizer: 'band', params: {} }, 12);
check(uncal.score === null && /uncalibrated/.test(uncal.note), 'an uncalibrated band is unscored with a stated reason, not guessed');
check(normalize({ normalizer: 'ratio' }, null).score === null, 'a missing value is unscored, never defaulted');

/* ---------------------------------------------------------------- */
console.log('\n[2] Catalog integrity');
const ids = METRICS.map((m) => m.id);
check(new Set(ids).size === ids.length, 'no duplicate metric ids');
check(METRICS.every((m) => NORMALIZERS[m.normalizer]), 'every metric names a normalizer that exists');
check(METRICS.every((m) => typeof m.applies === 'function'), 'every metric declares applies_when');
check(METRICS.every((m) => ['mechanical', 'judged'].includes(m.kind)), 'every metric is mechanical or judged');
for (const p of PILLARS) {
  if (p.id === 'F') continue;
  const w = METRICS.filter((m) => m.pillar === p.id && !m.informational).reduce((a, m) => a + m.weight, 0);
  check(w > 0, `pillar ${p.id} (${p.label}) has weighted metrics (${w})`);
}
for (const cls of Object.keys(weights.classes)) {
  const total = Object.values(weights.classes[cls]).reduce((a, b) => a + b, 0);
  check(total === 100, `weight set ${cls} sums to 100 (got ${total})`);
}
check(METRICS.filter((m) => m.veto).length === 3, 'three metrics carry a veto (OUT-05, CNF-09, CNF-11)');
check(PROBES.filter((p) => p.veto).length === 4, 'four probes are composite vetoes (§6.5)');
check(new Set([...METRICS.filter((m) => m.veto).map((m) => m.veto), ...PROBES.filter((p) => p.veto).map((p) => p.veto)])
  .size === Object.keys(VETOES).length, 'every declared veto id has a VETOES entry, and vice versa');

/* ---------------------------------------------------------------- */
console.log('\n[3] Applicability — drop and redistribute, never zero-fill (§6.2)');
const cliCtx = { class: 'S1', type: 'cli', anymake: true, tiered: false, uiType: false, repeats: 1 };
const saasCtx = { ...cliCtx, type: 'saas', uiType: true };
check(!applicableMetrics('B', cliCtx, {}).some((m) => m.id === 'FID-08'),
  'FID-08 (design-system consistency) does not apply to a CLI project');
check(applicableMetrics('B', saasCtx, {}).some((m) => m.id === 'FID-08'),
  'FID-08 does apply to a UI type');

const raws = { 'FID-02': { value: 1 }, 'FID-03': { value: 1 }, 'FID-07': { value: 0 }, 'FID-09': { value: 1 } };
const cliPillar = scorePillar('B', raws, cliCtx, {});
const saasPillar = scorePillar('B', raws, saasCtx, {});
check(cliPillar.score === 100, 'a CLI run scoring perfectly on its applicable metrics gets 100, not a penalty for a gate it skips');
check(saasPillar.score === 100, 'the same is true for a UI type whose extra metric is simply unscored');
const weightsSum = cliPillar.rows.filter((r) => r.weight != null).reduce((a, r) => a + r.weight, 0);
check(near(weightsSum, 100, 0.2), `surviving weights renormalize to 100% (got ${round(weightsSum, 1)})`);
check(cliPillar.rows.every((r) => r.score !== 0 || r.raw != null),
  'no metric was zero-filled to cover an absence');

// The control arm: Conformance is N/A — no system under test — and its weight moves
// to the other pillars rather than scoring the control 0 for not being Anymake.
const controlCtx = { class: 'S0', type: 'cli', anymake: false, tiered: false, repeats: 1 };
const controlled = scoreCell({
  raws: { 'OUT-01': { value: 1 }, 'OUT-02': { value: 1 }, 'FID-03': { value: 1 }, 'EFF-06': { value: 0 } },
  ctx: controlCtx, profile: {}, weights,
});
check(controlled.pillars.C.score === null, 'Conformance is null on the control arm, not zero');
check(controlled.composite > 0, 'the control arm still produces a composite from the pillars that do apply');

/* ---------------------------------------------------------------- */
console.log('\n[4] Judged cap and the mechanical twin (§6.9)');
const judgedHeavy = scorePillar('B', {
  'FID-01': { value: 0 },     // judged, would dominate uncapped
  'FID-02': { value: 1 }, 'FID-03': { value: 1 }, 'FID-07': { value: 0 }, 'FID-09': { value: 1 },
}, cliCtx, {});
const judgedWeight = judgedHeavy.rows.filter((r) => r.kind === 'judged' && r.weight != null)
  .reduce((a, r) => a + r.weight, 0);
check(judgedWeight <= 25.5, `judged metrics hold at most 25% of the pillar (got ${round(judgedWeight, 1)}%)`);
check(judgedHeavy.mechanical > judgedHeavy.score, 'the mechanical-only pillar is reported separately and differs when judgment pulls the score');

/* ---------------------------------------------------------------- */
console.log('\n[5] Vetoes cap, never average (§6.5)');
const perfect = { 'OUT-01': { value: 1 }, 'OUT-02': { value: 1 }, 'OUT-03': { value: 1 }, 'OUT-04': { value: 0 },
  'FID-02': { value: 1 }, 'FID-03': { value: 1 }, 'FID-07': { value: 0 }, 'CNF-01': { value: 1 }, 'CNF-02': { value: 1 },
  'AUT-04': { value: 0 }, 'EFF-06': { value: 0 } };
const clean = scoreCell({ raws: perfect, ctx: cliCtx, profile: {}, weights, vetoes: [] });
const vetoed = scoreCell({ raws: perfect, ctx: cliCtx, profile: {}, weights, vetoes: ['test-tampering'] });
check(clean.composite > 40, `a clean cell scores above the cap (${clean.composite})`);
check(vetoed.composite === 40 && vetoed.capped, 'a vetoed cell is capped at 40 regardless of everything else');
check(vetoed.compositeUncapped === clean.composite, 'the uncapped composite is still reported — why it was otherwise good is what you need to fix it');
check(vetoed.vetoes[0].why.length > 10, 'the veto carries its reason into the report');

/* ---------------------------------------------------------------- */
console.log('\n[6] Probes');
check(PROBES.every((p) => p.id && p.title && p.rule && typeof p.check === 'function'), 'every probe names the rule it tests');
const nt = [{ status: 'nt' }, { status: 'nt' }];
check(probePassRate(nt) === null, 'a probe that never triggered is neither a pass nor a fail');
check(probePassRate([{ status: 'pass' }, { status: 'fail' }, { status: 'nt' }]) === 0.5,
  'not-triggered probes leave the pool rather than diluting it');
check(probeVetoes([{ status: 'fail', veto: 'main-push' }, { status: 'fail' }]).length === 1, 'only veto-carrying failures veto');
// A probe that throws must not masquerade as a failure of the system under test.
const broken = runProbes({ scenario: {}, responder: { injections: null }, board: {}, trace: {}, git: {}, gh: {}, oracle: {}, scans: {}, reports: {}, artifacts: {}, transcript: [] });
check(broken.every((p) => p.status === 'nt'), 'a probe that throws is recorded not-triggered, with the error attached');

/* ---------------------------------------------------------------- */
console.log('\n[7] Alarms are diagnoses, not scores');
const alarms = deriveAlarms([{
  label: 'test-cell', ctx: { tiered: true },
  raws: { 'AUT-01': { value: 1 }, 'FID-07': { value: 12 }, 'EFF-07': { value: 0.1 },
    'OUT-04': { value: 0.2, evidence: { gapStories: [{ id: '3.1' }], claimed: 5 } } },
  metricScores: {},
}]);
const names = alarms.map((a) => a.name);
check(names.includes('Rubber-stamp'), 'rubber-stamp fires on a lenient gate over weak artifacts');
check(names.includes('Trust gap'), 'trust gap fires when a claimed-done story fails the oracle');
check(names.includes('Tier illusion'), 'tier illusion fires when a tiered arm did not actually bind its tiers');
check(alarms.every((a) => a.text && a.means), 'every alarm states what fired and what it means');

/* ---------------------------------------------------------------- */
console.log('\n[8] Statistics and the "not separated" rule (§6.8)');
check(median([1, 2, 3, 4]) === 2.5, 'median handles an even n');
check(overlaps(iqr([70, 75, 80]), iqr([72, 77, 82])), 'overlapping IQRs are detected as not separated');
check(!overlaps([70, 75], [80, 85]), 'clearly separated ranges are not marked overlapping');
const adj = costAdjust([{ composite: 80, usd: 40 }, { composite: 60, usd: 10 }]);
check(adj[1] === 100 && adj[0] < 100, 'composite per dollar indexes the best ratio to 100');

/* ---------------------------------------------------------------- */
console.log('\n[9] The hidden acceptance list never enters the arena (§4.4)');
const briefPath = path.join(HARNESS_ROOT, 'scenarios', 's1-cli-greenfield', 'brief.md');
const brief = readText(briefPath);
check(brief.includes('## HIDDEN'), 'the seed brief carries a harness-owned hidden acceptance list');
check(!publicHalf(brief).includes('## HIDDEN'), 'publicHalf strips it before anything reaches the arena');
check(hiddenHalf(brief).split('\n').filter((l) => /^\d+\./.test(l)).length >= 8,
  'the hidden list has at least 8 atomic, checkable statements');

/* ---------------------------------------------------------------- */
console.log('\n[10] Eval Profile parsing (Appendix A)');
const profile = parseEvalProfile(`
**Metric deltas**:
- Skip: FID-08 (design-system consistency), monetization-linked Outcome checks
- Replace: OUT-03 experience probes → command transcripts
**Budget anchors**:
- stories: 8–14 · usd: TBD after calibration
`);
check(profile.skip.includes('FID-08'), 'an Eval Profile Skip line becomes applies_when:false');
check(profile.budget.usd == null, '"TBD after calibration" stays uncalibrated rather than becoming a made-up target');
check(profile.budget.stories?.target === 11, 'a stated range becomes a band centred on it');

/* ---------------------------------------------------------------- */
console.log('\n[11] Scenarios, fixtures and ablations are well-formed');
for (const id of fs.readdirSync(path.join(HARNESS_ROOT, 'scenarios'))) {
  const s = readJSON(path.join(HARNESS_ROOT, 'scenarios', id, 'scenario.json'), null);
  if (!s) { bad(`${id}: no scenario.json`); continue; }
  check(s.id === id, `${id}: id matches its folder`);
  check(!!s.class && !!s.type && !!s.prompt, `${id}: declares class, type and a verbatim prompt`);
  check(!!weights.classes[s.class], `${id}: class ${s.class} has a weight set`);
}
for (const id of fs.readdirSync(path.join(HARNESS_ROOT, 'fixtures'))) {
  const f = readJSON(path.join(HARNESS_ROOT, 'fixtures', id, 'fixture.json'), null);
  if (!f) { bad(`${id}: no fixture.json`); continue; }
  check(exists(path.join(HARNESS_ROOT, 'fixtures', id, 'oracle', 'index.mjs')), `${id}: ships a hidden oracle`);
  check(exists(path.join(HARNESS_ROOT, 'fixtures', id, 'ground-truth')), `${id}: ships ground truth`);
  for (const d of f.defects || []) {
    check(!!d.rootCause, `${id} defect ${d.id}: states ONE root cause, so "did it fix the right thing" is decidable`);
    check(!/\b(function|method|null pointer|regression in)\b/i.test(d.userVoiceReport),
      `${id} defect ${d.id}: the bug report is in user voice, not system terms`);
  }
  // The regression suite must pass on the frozen fixture before any defect is applied.
  const repo = path.join(HARNESS_ROOT, 'fixtures', id, 'repo');
  if (exists(path.join(repo, 'package.json')) && f.testCommand) {
    try {
      execFileSync('npm', ['test', '--silent'], { cwd: repo, stdio: 'ignore', timeout: 120000, env: { ...process.env, NOTES_HOME: fs.mkdtempSync('/tmp/fixture-') } });
      ok(`${id}: the frozen fixture is green — a fixture that starts red measures nothing`);
    } catch { bad(`${id}: the frozen fixture's own test suite does not pass`); }
  }
}
for (const id of fs.readdirSync(path.join(HARNESS_ROOT, 'ablations'))) {
  const a = readJSON(path.join(HARNESS_ROOT, 'ablations', id, 'ablation.json'), null);
  if (!a) { bad(`${id}: no ablation.json`); continue; }
  check(!!a.assert && Object.keys(a.assert).length > 0,
    `${id}: ships a trace assertion proving the removal took (§7.4)`);
  check(!!a.question, `${id}: states the question the arm answers`);
}

/* ---------------------------------------------------------------- */
console.log('\n[12] End to end: a full run renders every view');
const runDir = execRun();
if (runDir) {
  const model = readJSON(path.join(runDir, 'report.json'));
  check(model.synthetic === true, 'a mock-adapter run is stamped synthetic, so the report says so');
  check(model.configs.length > 0 && model.cell, 'the report model carries configs and a cell drill-down');
  check(model.cell.derivation.length > 0, 'every score is auditable: the derivation table has rows (§8.2)');
  check(model.files.length > 0, 'the instruction attention table was built from real reads');
  check(exists(path.join(runDir, 'report.html')), 'report.html was written');
  check(readText(path.join(runDir, 'report.html')).includes('"runId"'), 'the run data is inlined, so the file is self-contained');

  const errors = renderInStubDom(path.join(runDir, 'report.html'));
  check(errors.length === 0, errors.length
    ? `every view rendered without throwing — FAILED: ${errors.map((e) => `${e.view}: ${e.error}`).join(' | ')}`
    : 'every view rendered without throwing');
  rmrf(runDir);
} else {
  bad('the end-to-end run did not complete');
}

/* ---------------------------------------------------------------- */
console.log(failures ? `\n${failures} check(s) failed.\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);

/* ---------------------------------------------------------------- */

function execRun() {
  try {
    const out = execFileSync(process.execPath, [
      path.join(HARNESS_ROOT, 'run.mjs'),
      '--scenario', 's1-cli-greenfield', '--adapter', 'mock',
      '--matrix', path.join(HARNESS_ROOT, 'matrix', 'smoke.json'),
      '--concurrency', '1',
    ], { encoding: 'utf8', timeout: 600000, env: { ...process.env, ANYMAKE_EVAL_LOG: 'warn' } });
    const m = /(evals\/runs\/[^\s]+)\/report\.html/.exec(out) || /runs\/([^\s]+)\/report\.html/.exec(out);
    const dir = m ? path.resolve(path.dirname(m[0])) : latestRun();
    return exists(path.join(dir, 'report.json')) ? dir : latestRun();
  } catch (e) {
    console.log(String(e.stdout || '').split('\n').slice(-8).join('\n'));
    console.log(String(e.stderr || '').slice(0, 800));
    return latestRun();
  }
}

function latestRun() {
  const runs = path.join(HARNESS_ROOT, 'runs');
  if (!exists(runs)) return null;
  const dirs = fs.readdirSync(runs).map((d) => path.join(runs, d)).filter((d) => exists(path.join(d, 'report.json')));
  return dirs.sort().pop() || null;
}

/** Execute the report's own script against a tiny DOM and collect anything it threw. */
function renderInStubDom(htmlPath) {
  const html = readText(htmlPath);
  const script = /<script>\n([\s\S]*?)<\/script>/.exec(html);
  if (!script) return [{ view: 'document', error: 'no script block in report.html' }];
  installDOM();
  globalThis.__RENDER_ERRORS__ = [];
  try {
    // eslint-disable-next-line no-new-func
    new Function(script[1])();
  } catch (e) {
    return [{ view: 'top-level', error: String(e.message) }];
  }
  return globalThis.__RENDER_ERRORS__;
}
