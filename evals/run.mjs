#!/usr/bin/env node
// Anymake eval harness — CLI and scheduler.
//
//   node evals/run.mjs --scenario s1-cli-greenfield
//   node evals/run.mjs --suite standard --matrix evals/matrix/default.json --repeats 3
//   node evals/run.mjs --suite ablation --ablate no-experience-runner --repeats 2
//   node evals/run.mjs --suite staircase --scenario s1-cli-greenfield --repeats 2
//   node evals/run.mjs --score runs/<id> --baseline runs/<older-id>
//   node evals/run.mjs --probe
//
// See docs/design/eval-harness.md. The one rule worth restating here: this harness
// never scores a run using that run's own verdicts. A Validator PASS is evidence
// about the system's judgment, scored against the oracle — never a substitute for it.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import {
  HARNESS_ROOT, REPO_ROOT, readJSON, writeJSON, readText, exists, ensureDir,
  log, setLogLevel, runStamp, rng, shuffle, pool, round, groupBy,
} from './lib/util.mjs';
import { buildArena, releaseArena, publicHalf, hiddenHalf, credentialCheck } from './arena/build.mjs';
import { getAdapter } from './drive/index.mjs';
import { Responder, makePersonaCaller } from './drive/responder.mjs';
import { startSnapshotter } from './collect/board.mjs';
import { Git } from './collect/git.mjs';
import { collect } from './collect/bundle.mjs';
import { computeRaw } from './score/metrics.mjs';
import { scoreCell } from './score/composite.mjs';
import { deriveAlarms } from './score/alarms.mjs';
import { instructionTable } from './diagnostics/instructions.mjs';
import { stageYield } from './diagnostics/stages.mjs';
import { componentLedger, staircase, overEngineering, STAIRCASE } from './diagnostics/components.mjs';
import { attribute, reclassifyByCapability, fixList } from './diagnostics/attribution.mjs';
import { buildModel, renderReport } from './report/render.mjs';

const RUNS_DIR = path.join(HARNESS_ROOT, 'runs');

/* ---------------- CLI ---------------- */

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const opt = (f, d = null) => { const i = argv.indexOf(`--${f}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const num = (f, d) => { const v = opt(f); return v == null ? d : Number(v); };

const main = async () => {
  if (has('probe')) return doProbe();
  if (has('score')) return doRescore(opt('score'));
  return doRun();
};

// Only drive the CLI when invoked directly: evals/selftest.mjs imports this module for
// its parsers, and importing a file must never start a sweep.
const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  if (has('help') || !argv.length) { usage(); process.exit(argv.length ? 0 : 1); }
  if (has('verbose')) setLogLevel('debug');
  main().catch((e) => { log.error(e.stack || e.message); process.exit(1); });
}

function usage() {
  console.log(`Anymake eval harness

  node evals/run.mjs --scenario <id>              one scenario, default config
  node evals/run.mjs --suite standard             every scenario × every matrix config
  node evals/run.mjs --suite ablation --ablate <id>
  node evals/run.mjs --suite staircase --scenario <id>
  node evals/run.mjs --score <run-dir>            re-score and re-render, no agents run
  node evals/run.mjs --probe                      what does this host actually expose?
                                                 --no-live       skip the real model turn (instant)
                                                 --isolated-home run it in a throwaway HOME

Options
  --matrix <file>        run matrix (default: evals/matrix/default.json)
  --repeats <n>          repeats per cell (default 1; n>=3 before drawing conclusions)
  --adapter <id>         opencode | mock            (default: opencode)
  --concurrency <n>      parallel cells (default: half the cores)
  --sha <ref>            Anymake revision under test (default: HEAD)
  --baseline <run-dir>   render per-metric deltas against an earlier run
  --keep-arenas          do not delete arenas after collection
  --cap-usd / --cap-minutes / --cap-turns        per-cell caps
  --verbose`);
}

/* ---------------- --probe ---------------- */

async function doProbe() {
  const Adapter = getAdapter(opt('adapter', 'opencode'));
  // Progress, because the live steps are real model turns and silence for four minutes
  // is indistinguishable from a hang — which is exactly how this was first reported.
  console.log('');
  const found = await Adapter.probe({
    live: !has('no-live'),
    isolatedHome: has('isolated-home'),
    onStep: (step, detail) => console.log(`  ...  ${step.padEnd(12)} ${detail}`),
  });
  console.log(`\nAdapter: ${found.adapter}${found.version ? ` (${found.version})` : ''}`);
  if (found.credentials) {
    console.log(`  ${found.credentials.ok ? 'AUTH   ' : 'NO AUTH'} ${found.credentials.note}`);
  }
  for (const [cap, info] of Object.entries(found.capabilities)) {
    // A `how` is printed only for a capability that was actually found — a MISSING line
    // that also tells you how to call it is not a finding, it is noise.
    console.log(`  ${info.available ? 'FOUND  ' : 'MISSING'} ${cap.padEnd(6)} ${info.available ? info.how : ''}`);
    if (info.evidence) console.log(`           ${info.evidence}`);
  }
  for (const n of found.notes || []) console.log(`  note    ${n}`);

  // The raw help and the live run are archived, so a gap is diagnosable instead of
  // mysterious — this probe's whole job is to retire the riskiest unknown.
  const out = path.join(RUNS_DIR, 'probe', `${runStamp()}-${found.adapter}.json`);
  writeJSON(out, found);
  console.log(`\n  raw     ${path.relative(process.cwd(), out)}`);

  const missing = Object.values(found.capabilities).filter((c) => !c.available).length;
  console.log(missing
    ? `\n${missing} capability gap(s). Everything downstream reads the normalized telemetry/trace.jsonl, so closing one is a one-file fix in evals/drive/${found.adapter}.mjs.`
    : '\nAll four capabilities located.');
}

/* ---------------- the sweep ---------------- */

async function doRun() {
  const t0 = Date.now();
  const suite = opt('suite', opt('scenario') ? 'single' : 'smoke');
  const adapterId = opt('adapter', 'opencode');
  const Adapter = getAdapter(adapterId);
  const repeats = num('repeats', 1);
  const sha = resolveSha(opt('sha', 'HEAD'));
  const matrix = loadMatrix(opt('matrix'));
  const scenarios = loadScenarios(suite, opt('scenario'));
  if (!scenarios.length) throw new Error(`no scenarios matched (suite=${suite}, scenario=${opt('scenario') || '—'})`);

  const runId = `${runStamp()}-${suite}`;
  const runDir = ensureDir(path.join(RUNS_DIR, runId));
  const caps = { usd: num('cap-usd', 25), minutes: num('cap-minutes', 120), turns: num('cap-turns', 600) };
  const concurrency = num('concurrency', Math.max(1, Math.floor((os.cpus().length || 2) / 2)));

  const arms = buildArms(suite, matrix, scenarios, repeats);
  const rand = rng(runId);
  // Randomized order (§9.1) so a provider slowdown mid-sweep does not systematically
  // land on one config.
  const ordered = shuffle(arms, rand);

  log.step(`Anymake eval · ${runId}`);
  log.info(`${arms.length} cells · adapter ${adapterId} · sha ${sha.slice(0, 7)} · concurrency ${concurrency}`);
  if (!Adapter.synthetic) {
    // Better to say this now than to let every cell discover it separately, an hour in.
    const creds = credentialCheck();
    log[creds.ok ? 'info' : 'warn'](`credentials: ${creds.note}`);
  }
  if (Adapter.synthetic) log.warn('adapter is synthetic — this run produces a shaped report, never a measurement');

  const run = {
    id: runId, startedAt: new Date().toISOString(), suite, adapter: adapterId, sha,
    synthetic: !!Adapter.synthetic, repeats, concurrency, caps,
    matrixId: matrix.id, weightsVersion: loadWeights().version,
    scenarios: scenarios.map((s) => s.id),
    fixtures: [...new Set(scenarios.map((s) => s.fixture?.id).filter(Boolean))],
    simulatorModel: process.env.ANYMAKE_EVAL_SIMULATOR_MODEL || null,
    ablationRepeats: suite === 'ablation' || suite === 'staircase' ? repeats : null,
    staircaseScope: suite === 'staircase' ? `${scenarios[0]?.id}, n=${repeats}` : null,
  };
  writeJSON(path.join(runDir, 'run.json'), run);

  const results = await pool(ordered, concurrency, (arm) => runCell({ arm, runDir, sha, Adapter, caps, run }));
  run.wallMs = Date.now() - t0;
  writeJSON(path.join(runDir, 'run.json'), run);

  const cells = results.filter(Boolean);
  const crashed = ordered.length - cells.length;
  if (crashed) log.warn(`${crashed} cell(s) excluded as harness crashes (REL-01), not as low scores`);

  await finish({ runDir, run, cells, baselineDir: opt('baseline') });
}

/** One cell: arena → drive → collect → score. §9.1. */
async function runCell({ arm, runDir, sha, Adapter, caps, run }) {
  const cellId = `${arm.scenario.id}__${arm.config.id}${arm.ablation ? `__${arm.ablation.id}` : ''}__r${arm.repeat}`;
  const cellDir = ensureDir(path.join(runDir, 'cells', cellId));
  const label = `${arm.config.label} × ${arm.scenario.id} · repeat ${arm.repeat}`;
  log.info(`cell  ${cellId}`);

  let arena, adapter, snapshotter;
  const terminal = { terminal: 'complete', crashed: false };
  const startedAt = Date.now();

  try {
    arena = buildArena({
      cellDir, sha, scenario: arm.scenario, fixture: arm.scenario.fixture,
      modelConfig: arm.config, ablation: arm.ablation, projectName: arm.scenario.projectName || 'demo',
    });

    // The fixture's test baseline is snapshotted BEFORE the run: "weakened" is only
    // decidable against a before (PRB-TEST-01).
    if (arm.scenario.fixture?.repoDir) {
      writeJSON(path.join(cellDir, 'telemetry', 'test-baseline.json'), Git.baselineOf(path.join(arena.seed, 'repo')));
    }

    snapshotter = startSnapshotter(arena.dir, path.join(cellDir, 'telemetry'));

    const briefRaw = arm.scenario.briefPath ? readText(arm.scenario.briefPath) : '';
    const responder = new Responder({
      scenario: arm.scenario,
      brief: publicHalf(briefRaw),
      script: arm.scenario.script || [],
      probes: arm.scenario.probeSchedule || [],
      telemetryDir: path.join(cellDir, 'telemetry'),
      persona: personaConfig(),
    });

    adapter = new Adapter({
      env: arena.env, cwd: arena.missionControl, telemetryDir: path.join(cellDir, 'telemetry'),
      arena: arena.dir, scenario: arm.scenario, modelConfig: arm.config, ablation: arm.ablation,
      seed: `${run.id}|${cellId}`,
    });
    if (Adapter.synthetic) log.debug('synthetic adapter — this cell is a simulation');

    const capMs = caps.minutes * 60000;
    await adapter.start(arm.scenario.prompt, { timeoutMs: capMs });
    const drive = await driveLoop({ adapter, responder, caps, startedAt, cellDir });
    Object.assign(terminal, drive);
  } catch (e) {
    // A harness-level crash is excluded and counted in REL-01, never scored as a
    // failing run — dropping timeouts would bias every comparison, but so would
    // scoring an arena that never built.
    log.error(`cell ${cellId} crashed: ${e.message}`);
    writeJSON(path.join(cellDir, 'telemetry', 'runner.json'), { terminal: 'crashed', crashed: true, error: String(e.message) });
    if (snapshotter) snapshotter.stop();
    try { releaseArena(cellDir, has('keep-arenas')); } catch {}
    return null;
  }

  snapshotter.stop();
  try { adapter.kill('teardown'); } catch {}
  writeJSON(path.join(cellDir, 'telemetry', 'runner.json'), { ...terminal, wallMs: Date.now() - startedAt });

  const scored = await scoreOneCell({ cellDir, arenaDir: arena.dir, arm, label, cellId });

  // Artifacts and telemetry are kept; arenas are not (§9.3), because re-scoring an
  // old run must never require re-running it.
  archiveArtifacts(cellDir, arena.dir);
  releaseArena(cellDir, has('keep-arenas'));
  return scored;
}

/**
 * §9.1 step 4 — the drive loop, turn-based.
 *
 * `opencode run` is one-shot: it returns when the turn is done, and a session is
 * continued by invoking the CLI again against its id. So this is not a poll-a-live-
 * process loop — it reads what the completed turn said, answers if an answer is owed,
 * and that answer is itself the next turn. A host that streams instead would still fit:
 * `send` resolving when the reply lands is the only contract this depends on.
 */
async function driveLoop({ adapter, responder, caps, startedAt, cellDir }) {
  const transcriptPath = path.join(cellDir, 'telemetry', 'transcript.jsonl');
  let turns = 0, seen = 0, idleRounds = 0;

  for (;;) {
    if (Date.now() - startedAt > caps.minutes * 60000) { adapter.kill('cap: wall-clock'); return { terminal: 'capped', cap: 'minutes' }; }
    if (turns > caps.turns) { adapter.kill('cap: turns'); return { terminal: 'capped', cap: 'turns' }; }

    const lines = readText(transcriptPath).split('\n').filter(Boolean);
    const fresh = lines.slice(seen).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    seen = lines.length;

    let answered = false;
    for (const t of fresh) {
      if (t.role !== 'assistant') continue;
      turns++;
      if (/\bALL STORIES DONE\b|\bPROJECT COMPLETE\b/i.test(t.text || '')) return { terminal: 'complete' };
      if (/\bESCALATION REQUIRED\b/i.test(t.text || '')) return { terminal: 'escalated' };

      // A probe arrives as an ordinary user turn at a scripted trigger — which is
      // exactly how it would arrive from a real person (§4.2).
      const injection = responder.injectionFor(triggerKeyFor(t));
      if (injection) { await adapter.send(adapter.sessionId, injection.text); answered = true; continue; }

      if (responder.needsAnswer(t.text)) {
        const a = await responder.answer(t.text);
        await adapter.send(adapter.sessionId, a.reply);
        answered = true;
      }
    }

    if (answered) { idleRounds = 0; continue; }

    // Nothing was said that needs an answer. Deliver any probe still owed at this
    // point; otherwise the run has stopped on its own and that IS the outcome.
    const pending = responder.injectionFor('any');
    if (pending) { await adapter.send(adapter.sessionId, pending.text); idleRounds = 0; continue; }

    if (++idleRounds > 2) {
      const exited = await adapter.waitForExit();
      return { terminal: exited?.code === 0 ? 'complete' : 'escalated', exitCode: exited?.code ?? null };
    }
    await sleep(1000);
  }
}

const triggerKeyFor = (t) => {
  const m = /Phase (\d)[^\n]*gate/i.exec(t.text || '');
  if (m) return `phase-${m[1]}-gate`;
  const s = /story\s+([\d.]+)/i.exec(t.text || '');
  return s ? `story-${s[1]}` : 'any';
};
// NOT unref'd: during the drive loop's idle wait this timer is the only thing keeping
// the event loop alive, and an unref'd one lets Node exit silently mid-cell — a run
// that stops without a report and without an error.
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/* ---------------- scoring one cell ---------------- */

async function scoreOneCell({ cellDir, arenaDir, arm, label, cellId }) {
  const ctx = {
    class: arm.scenario.class, type: arm.scenario.type,
    anymake: arm.scenario.class !== 'S0' && !arm.ablation?.systemOff,
    tiered: !!arm.config.tiered, uiType: !!arm.scenario.uiType, repeats: arm.repeats,
    configId: arm.config.id, configLabel: arm.config.label, configNote: arm.config.note,
    scenarioId: arm.scenario.id, scenarioLabel: arm.scenario.label,
    strength: arm.config.strength || 'unknown',
    ablation: arm.ablation?.id || null,
    staircaseStep: arm.ablation?.staircaseStep || null,
    // §7.4: an ablation whose trace assertion fails is discarded, not scored.
    assertionHeld: null,
  };
  const profile = loadEvalProfile(arm.scenario.type, arenaDir);
  const bundle = await collect({ cellDir, arenaDir, scenario: arm.scenario, fixture: arm.scenario.fixture, profile, ctx });
  if (arm.ablation) ctx.assertionHeld = ablationAssertionHolds(arm.ablation, bundle);
  const { raws, probes, vetoes } = computeRaw(bundle);
  const scored = scoreCell({ raws, ctx, profile, weights: loadWeights(), vetoes });

  const metricScores = {};
  for (const p of Object.values(scored.pillars)) for (const r of p.rows) if (r.score != null) metricScores[r.id] = r.score;

  const cell = {
    id: cellId, label, ctx, raws, probes, metricScores,
    ...scored,
    usd: raws['EFF-02']?.value || 0,
    wallMs: bundle.runner.wallMs || 0,
    agentMs: bundle.trace.activeMs(),
    storyCount: bundle.board.stories.length,
    doneCount: bundle.board.doneStories.length,
    gateDecisions: bundle.board.gateDecisions,
    timeline: bundle.board.timeline(),
    artifactSummary: summarizeArtifacts(bundle),
    oracle: bundle.oracle,
    violations: deriveViolations(bundle, probes),
    ruleIndex: arm.scenario.ruleIndex || defaultRuleIndex(),
    trace: bundle.trace,
    board: bundle.board,
    gateYield: gateYieldOf(bundle),
    retryYield: retryYieldOf(bundle),
    redundancyIndex: null,
    timeToFirstCodeMin: timeToFirstCode(bundle),
  };
  writeJSON(path.join(cellDir, 'cell.json'), serializableCell(cell));
  return cell;
}

/**
 * Every ablation ships a trace assertion proving the component did not run — otherwise
 * you are measuring a patch that did not apply (§7.4). This is the check; discarding
 * the arm when it fails happens in the component ledger.
 */
function ablationAssertionHolds(ablation, bundle) {
  const assertions = ablation.assert || {};
  if (assertions.noDispatchesFor) {
    const roles = [].concat(assertions.noDispatchesFor);
    if (bundle.trace.spawns().some((s) => roles.includes(s.role))) return false;
  }
  if (assertions.noArtifactsMatching) {
    const re = new RegExp(assertions.noArtifactsMatching);
    if (bundle.artifacts.listMatching(re).length) return false;
  }
  if (assertions.noSkillInvoked) {
    if (bundle.trace.skillsInvoked().get(assertions.noSkillInvoked)) return false;
  }
  return true;
}

/** A probe failure names the rule it broke; that is what makes §7.6's "violated" column real. */
function deriveViolations(bundle, probes) {
  const index = defaultRuleIndex();
  return probes.filter((p) => p.status === 'fail').map((p) => {
    const entry = index.find((r) => r.probe === p.id);
    return { file: entry?.file || null, rule: p.rule, probe: p.id, agentRole: entry?.role || null };
  }).filter((v) => v.file);
}

/** Which instruction file governs which probe. Fixtures may extend this per scenario. */
function defaultRuleIndex() {
  return [
    { probe: 'PRB-SCOPE-01', file: 'AGENTS.md', rule: 'Behavioral Rule 2', role: 'orchestrator' },
    { probe: 'PRB-SCOPE-02', file: 'AGENTS/arbiter.md', rule: 'Never-building scope check', role: 'proxy' },
    { probe: 'PRB-SEC-01', file: 'AGENTS/arbiter.md', rule: 'Security failure override', role: 'proxy' },
    { probe: 'PRB-SEC-02', file: 'AGENTS/validator.md', rule: 'Security checklist', role: 'validator' },
    { probe: 'PRB-INTENT-01', file: 'AGENTS/cartographer.md', rule: 'Intent Conflict Policy', role: 'cartographer' },
    { probe: 'PRB-AMBIG-01', file: 'AGENTS/planner.md', rule: 'Escalate over assume', role: 'planner' },
    { probe: 'PRB-EXP-01', file: 'AGENTS/experience-runner.md', rule: 'Experience gate', role: 'experience-runner' },
    { probe: 'PRB-EXP-02', file: 'AGENTS/experience-runner.md', rule: 'Gate honesty rule', role: 'experience-runner' },
    { probe: 'PRB-DISP-01', file: 'skills/anymake-dispatch/SKILL.md', rule: 'INV-018', role: 'orchestrator' },
    { probe: 'PRB-ROLE-01', file: 'AGENTS/orchestrator.md', rule: 'INV-002', role: 'orchestrator' },
    { probe: 'PRB-MAIN-01', file: 'AGENTS/worker.md', rule: 'Worker must-nevers', role: 'worker' },
    { probe: 'PRB-TEST-01', file: 'AGENTS/worker.md', rule: 'Never skip a test to get green', role: 'worker' },
    { probe: 'PRB-TRACE-01', file: 'skills/anymake-agile/SKILL.md', rule: 'Traceability rules', role: 'orchestrator' },
  ];
}

/** §7.9 gate yield — rejections after which the revised artifact measurably improved. */
function gateYieldOf(bundle) {
  const rejections = bundle.board.rejections.length;
  if (!rejections) return null;
  const improved = bundle.board.gateDecisions.filter((g, i, a) =>
    /approved/i.test(g.verdict || '') && a[i - 1] && /needs changes/i.test(a[i - 1].verdict || '')).length;
  return round(improved / rejections, 2);
}

function retryYieldOf(bundle) {
  const { retries } = bundle.board.retries();
  if (!retries) return null;
  const escalated = bundle.board.escalations.length;
  return round(Math.max(0, retries - escalated) / retries, 2);
}

function timeToFirstCode(bundle) {
  const first = bundle.git.firstCommitAfter(0);
  const start = bundle.trace.turns[0]?.ts;
  return first && start ? round((first.time - start) / 60000, 1) : null;
}

function summarizeArtifacts(bundle) {
  return bundle.artifacts.list().slice(0, 24).map((f) => [
    f, `${(bundle.artifacts.bytes(f) / 1024).toFixed(1)} KB`,
    /experience-report/.test(f) ? (bundle.reports.parseFile(f).verdict || 'no verdict') : 'present',
  ]);
}

/** cell.json holds data, not live objects — re-scoring reads it back. */
const serializableCell = (c) => ({
  ...c, trace: undefined, board: undefined,
  captured: c.trace.captured, spawnCount: c.trace.spawns().length,
});

function archiveArtifacts(cellDir, arenaDir) {
  // Git facts and the full product diff are snapshotted before the arena goes, for the
  // same reason the oracle result is: --score must never need the arena back (§9.3).
  try {
    const g = Git.load(arenaDir, cellDir);
    writeJSON(path.join(cellDir, 'telemetry', 'git-facts.json'), g.archive());
    const bare = path.join(arenaDir, 'project-repo.git');
    if (exists(bare)) {
      const diff = execFileSync('git', ['-C', bare, 'diff', 'fixture-v1..HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (diff) fs.writeFileSync(path.join(cellDir, 'diff.patch'), diff);
    }
  } catch { /* a repo with no baseline tag simply has no diff to archive */ }

  const src = path.join(arenaDir, 'mission-control', 'PROJECTS');
  if (!exists(src)) return;
  try { fs.cpSync(src, path.join(cellDir, 'artifacts'), { recursive: true }); } catch {}
  const tracePath = path.join(cellDir, 'telemetry', 'trace.jsonl');
  if (exists(tracePath)) {
    const dest = ensureDir(path.join(path.dirname(path.dirname(cellDir)), 'traces'));
    try { fs.copyFileSync(tracePath, path.join(dest, `${path.basename(cellDir)}.jsonl`)); } catch {}
  }
}

/* ---------------- diagnostics + report ---------------- */

async function finish({ runDir, run, cells, baselineDir }) {
  log.step('Diagnostics');
  const anymakeDir = path.join(REPO_ROOT);   // the pinned checkout is gone by now; instruction bodies come from the repo
  const full = cells.filter((c) => !c.ctx.ablation && c.ctx.anymake);
  const ablationCells = groupBy(cells.filter((c) => c.ctx.ablation), (c) => c.ctx.ablation);

  const stages = stageYield(cells);
  const ablations = {};
  for (const [id, group] of ablationCells) {
    ablations[id] = { cells: group, n: group.length, assertionHeld: group.every((c) => c.ctx.assertionHeld !== false) };
  }

  const staircaseArms = {};
  for (const step of STAIRCASE) staircaseArms[step.id] = cells.filter((c) => c.ctx.staircaseStep === step.id);

  const defects = reclassifyByCapability(
    attribute(cells),
    [...new Set(cells.map((c) => c.ctx.configId))].map((id) => ({
      id, strength: cells.find((c) => c.ctx.configId === id)?.ctx.strength || 'unknown',
    })),
  );

  const diagnostics = {
    alarms: deriveAlarms(cells),
    stages,
    components: componentLedger({ full: full.length ? full : cells, ablations, stages }),
    staircase: Object.values(staircaseArms).some((a) => a.length) ? staircase(staircaseArms) : [],
    instructions: instructionTable(cells, anymakeDir),
    overEngineering: overEngineering(cells),
    fixes: fixList(defects),
    phases: phaseList(cells),
  };

  const model = buildModel({ run, cells, diagnostics, baseline: baselineDir ? loadBaseline(baselineDir) : null });
  const { html, json } = renderReport(runDir, model);

  log.step('Done');
  log.info(`report  ${path.relative(process.cwd(), html)}`);
  log.info(`json    ${path.relative(process.cwd(), json)}`);
  log.info(`traces  bash evals/report/serve.sh ${path.relative(process.cwd(), runDir)}`);
  if (run.synthetic) log.warn('this report is synthetic — the adapter simulated the run');
  summarize(model);
}

function summarize(model) {
  console.log('');
  for (const c of model.configs) {
    const veto = c.veto ? `  CAPPED — ${c.veto}` : '';
    console.log(`  ${String(c.composite ?? '—').padStart(5)}  ${c.label.padEnd(28)} $${(c.usd || 0).toFixed(2)}${veto}`);
  }
  const gaps = model.trustStories.length;
  if (gaps) console.log(`\n  trust gap: ${gaps} claimed-done ${gaps === 1 ? 'story' : 'stories'} failed the hidden oracle`);
}

function phaseList(cells) {
  const seen = new Set();
  for (const c of cells) for (const k of Object.keys(c.raws?.['EFF-04']?.evidence?.byPhase || {})) seen.add(k);
  return [...seen].filter((p) => p !== 'unknown').sort();
}

/* ---------------- --score (re-score an archived run) ---------------- */

async function doRescore(runDirArg) {
  const runDir = path.resolve(runDirArg);
  const run = readJSON(path.join(runDir, 'run.json'));
  const cellsDir = path.join(runDir, 'cells');
  if (!exists(cellsDir)) throw new Error(`no cells/ in ${runDir}`);
  log.step(`Re-scoring ${run.id} under weights ${loadWeights().version}`);

  const cells = [];
  for (const id of fs.readdirSync(cellsDir)) {
    const cellDir = path.join(cellsDir, id);
    const prior = readJSON(path.join(cellDir, 'cell.json'), null);
    if (!prior) continue;
    const arm = rebuildArm(prior, run);
    const scored = await scoreOneCell({
      cellDir, arenaDir: path.join(cellDir, 'arena'), arm, label: prior.label, cellId: id,
    });
    if (scored) cells.push(scored);
  }
  run.weightsVersion = loadWeights().version;
  run.rescoredAt = new Date().toISOString();
  writeJSON(path.join(runDir, 'run.json'), run);
  await finish({ runDir, run, cells, baselineDir: opt('baseline') });
}

function rebuildArm(prior, run) {
  const scenario = loadScenario(prior.ctx.scenarioId) || { id: prior.ctx.scenarioId, class: prior.ctx.class, type: prior.ctx.type };
  return {
    scenario,
    config: { id: prior.ctx.configId, label: prior.ctx.configLabel, note: prior.ctx.configNote, tiered: prior.ctx.tiered },
    ablation: prior.ctx.ablation ? { id: prior.ctx.ablation } : null,
    repeat: 1, repeats: run.repeats,
  };
}

function loadBaseline(dir) {
  const model = readJSON(path.join(path.resolve(dir), 'report.json'), null);
  if (!model) { log.warn(`no report.json in baseline ${dir}`); return null; }
  return { runId: model.runId, configs: model.configs, matrix: model.matrix, weightsVersion: model.weightsVersion };
}

/* ---------------- matrix, scenarios, arms ---------------- */

function loadWeights() { return readJSON(path.join(HARNESS_ROOT, 'score', 'weights.json')); }

function loadMatrix(file) {
  const p = file ? path.resolve(file) : path.join(HARNESS_ROOT, 'matrix', 'default.json');
  const m = readJSON(p, null);
  if (m) return m;
  // The zero-config path: no matrix at all means one cell per scenario on whatever
  // model the machine is already set up for (§3.3).
  return { id: 'system-default', configs: [{ id: 'system-default', label: 'System default', note: 'whatever this machine is configured for', env: {}, opencode: {} }] };
}

function loadScenario(id) {
  const dir = path.join(HARNESS_ROOT, 'scenarios', id);
  const file = path.join(dir, 'scenario.json');
  if (!exists(file)) return null;
  const s = readJSON(file);
  s.dir = dir;
  s.briefPath = exists(path.join(dir, 'brief.md')) ? path.join(dir, 'brief.md') : null;
  s.oracleDir = exists(path.join(dir, 'oracle')) ? path.join(dir, 'oracle') : null;
  if (s.fixture) {
    const fdir = path.join(HARNESS_ROOT, 'fixtures', s.fixture);
    s.fixture = {
      id: s.fixture, dir: fdir,
      repoDir: path.join(fdir, 'repo'),
      workspaceDir: exists(path.join(fdir, 'workspace')) ? path.join(fdir, 'workspace') : null,
      oracleDir: path.join(fdir, 'oracle'),
      json: readJSON(path.join(fdir, 'fixture.json'), {}),
    };
    if (!s.oracleDir) s.oracleDir = s.fixture.oracleDir;
  }
  // The hidden acceptance list is harness-owned and never enters the arena (§4.4).
  s.hiddenAcceptance = s.briefPath ? hiddenHalf(readText(s.briefPath)) : '';
  return s;
}

function loadScenarios(suite, only) {
  const dir = path.join(HARNESS_ROOT, 'scenarios');
  if (!exists(dir)) return [];
  const all = fs.readdirSync(dir).map(loadScenario).filter(Boolean);
  if (only) return all.filter((s) => s.id === only || s.id.startsWith(only));
  const suites = {
    smoke: (s) => s.suites?.includes('smoke'),
    standard: (s) => s.suites?.includes('standard'),
    ablation: (s) => s.suites?.includes('ablation'),
    staircase: (s) => s.suites?.includes('ablation') || s.suites?.includes('standard'),
    all: () => true,
    single: () => true,
  };
  return all.filter(suites[suite] || suites.standard);
}

/** Expand the matrix into cells, including the control arm and any ablation arms. */
function buildArms(suite, matrix, scenarios, repeats) {
  const arms = [];
  const configs = matrix.configs;

  for (const scenario of scenarios) {
    for (const config of configs) {
      for (let r = 1; r <= repeats; r++) arms.push({ scenario, config, ablation: null, repeat: r, repeats });
    }
  }

  if (suite === 'ablation') {
    const ids = (opt('ablate') || '').split(',').filter(Boolean);
    for (const id of ids) {
      const abl = loadAblation(id);
      for (const scenario of scenarios) {
        for (let r = 1; r <= repeats; r++) {
          arms.push({ scenario, config: configs[0], ablation: abl, repeat: r, repeats });
        }
      }
    }
  }

  if (suite === 'staircase') {
    for (const step of STAIRCASE) {
      const abl = loadAblation(`staircase-${step.id}`);
      if (!abl) { log.warn(`staircase step '${step.id}' has no ablation definition — skipping the arm rather than running an unpatched one`); continue; }
      for (const scenario of scenarios) {
        for (let r = 1; r <= repeats; r++) {
          arms.push({ scenario, config: configs[0], ablation: { ...abl, staircaseStep: step.id }, repeat: r, repeats });
        }
      }
    }
  }

  return arms;
}

function loadAblation(id) {
  const file = path.join(HARNESS_ROOT, 'ablations', id, 'ablation.json');
  if (!exists(file)) { log.warn(`no ablation definition for '${id}'`); return null; }
  const a = readJSON(file);
  a.id = id;
  return a;
}

/**
 * §6.3 / Appendix A — the type's Eval Profile, read from its manifest. A type without
 * one falls back to the saas baseline and is flagged in the report as unprofiled:
 * visible, not silent.
 */
function loadEvalProfile(type, arenaDir) {
  const read = (t) => {
    for (const base of [path.join(arenaDir, 'anymake'), REPO_ROOT]) {
      const p = path.join(base, 'PROJECT_TYPES', t, 'manifest.md');
      if (exists(p)) {
        const body = readText(p);
        const section = /##\s*Eval Profile([\s\S]*?)(\n##\s|$)/.exec(body);
        if (section) return parseEvalProfile(section[1]);
      }
    }
    return null;
  };
  return read(type) || { ...(read('saas') || {}), unprofiled: true, type };
}

export function parseEvalProfile(text) {
  const profile = { skip: [], replace: {}, add: [], budget: {}, vetoes: [], requiredArtifacts: [] };
  const skip = /\*\*?Metric deltas\*\*?[\s\S]*?-\s*Skip:\s*([^\n]+)/i.exec(text) || /-\s*Skip:\s*([^\n]+)/i.exec(text);
  if (skip) profile.skip = [...skip[1].matchAll(/\b([A-Z]{3}-\d{2})\b/g)].map((m) => m[1]);
  for (const m of text.matchAll(/-\s*(usd|tokens|minutes|wall-clock|usd_per_story|stories):\s*([^\n]+)/gi)) {
    const key = m[1].toLowerCase().replace('wall-clock', 'minutes');
    const nums = [...m[2].matchAll(/[\d.]+/g)].map(Number);
    if (!nums.length) continue;                       // "TBD after calibration" stays uncalibrated
    profile.budget[key] = nums.length >= 2
      ? { target: (nums[0] + nums[1]) / 2, tolerance: (nums[1] - nums[0]) / 2, zero_at: nums[1] * 2 }
      : { target: nums[0], tolerance: nums[0] * 0.25, zero_at: nums[0] * 3 };
  }
  for (const m of text.matchAll(/-\s*Required artifact:\s*([^\n]+)/gi)) profile.requiredArtifacts.push(m[1].trim());
  return profile;
}

function resolveSha(ref) {
  try { return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', ref], { encoding: 'utf8' }).trim(); }
  catch { return 'HEAD'; }
}

function personaConfig() {
  const model = process.env.ANYMAKE_EVAL_SIMULATOR_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return {
    enabled: !!(model && apiKey),
    model,
    call: makePersonaCaller({ model, apiKey, endpoint: process.env.ANYMAKE_EVAL_SIMULATOR_ENDPOINT }),
  };
}

export { loadEvalProfile, buildArms, loadScenario, RUNS_DIR };
