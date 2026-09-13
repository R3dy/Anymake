// The replay adapter — a deterministic, offline stand-in for a host.
//
// It exists for two honest reasons and no dishonest ones:
//   1. Every part of the harness downstream of the adapter (collectors, probes,
//      scoring, diagnostics, report) needs a way to be tested without spending money
//      or depending on a provider — evals/selftest.mjs runs against this.
//   2. `--adapter mock` gives you a complete report to look at on day one, so the
//      report spec can be reviewed before the first real sweep.
//
// It is NOT a measurement of anything. Every run it produces is stamped
// `synthetic: true`, and the report renders the synthetic banner from that stamp.
// Nothing in this file may ever be used to answer Q1–Q5.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { appendJSONL, writeJSON, writeText, ensureDir, rng, round } from '../lib/util.mjs';

const ROLES = ['planner', 'worker', 'validator', 'experience-runner'];
const AGENT = { planner: 'anymake-planner', worker: 'anymake-worker', validator: 'anymake-validator', 'experience-runner': 'anymake-experience-runner' };
const TIER = { planner: 2, worker: 3, validator: 2, 'experience-runner': 2 };

export class MockAdapter {
  static id = 'mock';
  static synthetic = true;

  constructor({ env, cwd, telemetryDir, arena, scenario, modelConfig, seed, ablation }) {
    this.env = env; this.cwd = cwd; this.telemetryDir = telemetryDir; this.arena = arena;
    this.scenario = scenario; this.modelConfig = modelConfig; this.ablation = ablation;
    this.rand = rng(`${seed}|${scenario?.id}|${modelConfig?.id}|${ablation?.id || ''}`);
    this.t = Date.now();
    this.pending = [];
  }

  static async probe() {
    return {
      adapter: 'mock', version: 'built-in', synthetic: true,
      capabilities: Object.fromEntries(['start', 'send', 'usage', 'kill'].map((c) => [c, { available: true, how: 'in-process simulation' }])),
      notes: ['synthetic — produces a shaped run, never a measurement'],
    };
  }

  async start(prompt) {
    this.sessionId = 'mock-1';
    appendJSONL(path.join(this.telemetryDir, 'transcript.jsonl'), { ts: this.t, role: 'user', text: prompt });
    await this._simulate();
    return this.sessionId;
  }

  async send(_sid, message) {
    appendJSONL(path.join(this.telemetryDir, 'transcript.jsonl'), { ts: this.tick(1000), role: 'user', text: message });
    return { ok: true };
  }

  usage() { return []; }
  kill() {}
  async waitForExit() { return { code: 0 }; }

  tick(ms) { this.t += ms; return this.t; }

  /* ------------------------------------------------------------------ */

  async _simulate() {
    const quality = this.modelConfig?.mockQuality ?? 0.85;   // the arm's competence, in one dial
    const project = this.env.ANYMAKE_PROJECT || 'demo';
    const projectDir = ensureDir(path.join(this.arena, 'mission-control', 'PROJECTS', project));
    // A run with no system installed has no roles, no gates and no board — the
    // control arm must not quietly simulate the thing it is the control for.
    const systemOff = this.ablation?.systemOff || this.scenario?.class === 'S0';
    const has = (component) => !systemOff && !(this.ablation?.removes || []).includes(component);

    const storyCount = 6;
    const stories = Array.from({ length: storyCount }, (_, i) => ({
      id: `3.${i + 1}`, title: `Story ${i + 1}`, status: 'todo', attempts: 1,
    }));

    const state = { schema_version: 1, project, phase: 0, updated: new Date(this.t).toISOString(), stories };
    const boardPath = path.join(projectDir, '.anymake', 'board-state.json');
    const sessionLog = path.join(projectDir, '.anymake', 'session-log.jsonl');
    const snapshots = path.join(this.telemetryDir, 'board-snapshots.jsonl');
    const snap = () => appendJSONL(snapshots, { ts: this.t, file: '.anymake/board-state.json', valid: true, state: JSON.parse(JSON.stringify(state)) });

    writeJSON(boardPath, state);
    snap();

    // Phases 0–3: artifacts, gates.
    for (const phase of [0, 1, 2, 3]) {
      state.phase = phase; this.tick(6 * 60000);
      if (!systemOff) this._turn({ agent: 'anymake-orchestrator', role: 'orchestrator', tier: 1, phase, tokens: 4000 + phase * 600, out: 900 });
      else this._turn({ agent: 'solo', role: 'worker', tier: 1, phase, tokens: 9000, out: 3200 });
      writeJSON(boardPath, state); snap();
      if (phase > 0 && has('proxy')) {
        const rounds = this.rand() > quality ? 2 : 1;
        for (let r = 1; r <= rounds; r++) {
          appendJSONL(sessionLog, { ts: this.tick(5000), type: 'dispatch', agent: 'anymake-product-owner-proxy', story: null });
          this._turn({ agent: 'anymake-product-owner-proxy', role: 'proxy', tier: 1, phase, tokens: 5200, out: 700,
            verdict: r < rounds ? 'NEEDS CHANGES' : 'APPROVED' });
          appendJSONL(sessionLog, { ts: this.tick(60000), type: 'gate', gate: `Phase ${phase}`, verdict: r < rounds ? 'NEEDS CHANGES' : 'APPROVED', notes: '' });
        }
      }
    }

    this._writeArtifacts(projectDir, stories, quality, has);

    // Phase 4: the build loop, one story at a time, with the four roles per story.
    state.phase = 4;
    const gapStories = [];
    for (const s of stories) {
      s.status = 'in_progress'; writeJSON(boardPath, state); snap();
      const failsValidation = this.rand() > quality;
      const roles = systemOff ? ['worker'] : ROLES;
      for (const role of roles) {
        if (role === 'experience-runner' && !has('experience-runner')) continue;
        if (role === 'validator' && !has('validator')) continue;
        if (role === 'planner' && !has('planner')) continue;
        const attempt = role === 'worker' && failsValidation ? 2 : 1;
        if (!systemOff) appendJSONL(sessionLog, { ts: this.tick(30000), type: 'dispatch', agent: AGENT[role], story: s.id });
        this._turn({
          agent: AGENT[role], role, tier: TIER[role], story: s.id, attempt, phase: 4,
          tokens: role === 'worker' ? 26000 : 12000, out: role === 'worker' ? 8000 : 2000,
          verdict: role === 'validator' ? (failsValidation ? 'FAIL' : 'PASS') : (role === 'experience-runner' ? 'PASS' : null),
          artifact: role === 'planner' ? `task-brief-story-${s.id}.md`
            : role === 'validator' ? `validation-report-story-${s.id}.md`
            : role === 'experience-runner' ? `experience-report-story-${s.id}.md` : null,
        });
        if (role === 'validator' && failsValidation) {
          s.attempts = 2;
          appendJSONL(sessionLog, { ts: this.tick(20000), type: 'retry', story: s.id, reason: 'validation FAIL → retry' });
          this._turn({ agent: AGENT.worker, role: 'worker', tier: 3, story: s.id, attempt: 2, phase: 4, tokens: 28000, out: 7400 });
          this._turn({ agent: AGENT.validator, role: 'validator', tier: 2, story: s.id, attempt: 2, phase: 4, tokens: 12500, out: 2100, verdict: 'PASS',
            artifact: `validation-report-story-${s.id}.md` });
        }
      }
      this._commit(s, quality);
      s.status = 'done'; writeJSON(boardPath, state); snap();
      // The trust gap the whole instrument exists to measure: a story the system
      // calls done that the hidden oracle will disagree about.
      if (this.rand() > quality + 0.08) gapStories.push(s.id);
    }

    state.phase = 5; this.tick(8 * 60000); writeJSON(boardPath, state); snap();
    this._writeBoardMd(projectDir, stories, gapStories);
    writeJSON(path.join(this.telemetryDir, 'mock-truth.json'), { gapStories, quality });
  }

  _turn({ agent, role, tier, story = null, attempt = 1, phase = null, tokens, out, verdict = null, artifact = null }) {
    const served = this._modelFor(tier);
    const requested = this._requestedFor(tier);
    const duration = Math.round(20000 + this.rand() * 90000);
    this.tick(duration);
    appendJSONL(path.join(this.telemetryDir, 'trace.jsonl'), {
      ts: this.t, agent, role, tier, story, attempt, phase,
      model_requested: requested, model_served: served,
      tokens: { in: tokens, out, cache_read: Math.round(tokens * 0.4), cache_write: 0 },
      usd: round((tokens * 3 + out * 15) / 1e6 * (tier === 3 ? 0.25 : tier === 2 ? 1 : 3), 5),
      duration_ms: duration,
      reasoning: null,   // the mock host does not persist reasoning — absent, never invented
      message: verdict ? `VERDICT: ${verdict}` : `${role} turn`,
      tool_calls: [{ name: 'Read', args: `AGENTS/${role}.md`, ms: 90 }],
      files_read: [
        { path: `AGENTS/${role === 'proxy' ? 'product-owner-proxy' : role}.md`, tokens: 2400 },
        { path: 'AGENTS/arbiter.md', tokens: 3100 },
        ...(story ? [{ path: `PROJECTS/demo/docs/03-solutioning/epics.md`, tokens: 1800 }] : []),
      ],
      skills_invoked: role === 'worker' ? ['anymake-build-loop'] : [],
      artifact_written: artifact,
      verdict_emitted: verdict,
    });
    appendJSONL(path.join(this.telemetryDir, 'transcript.jsonl'), {
      ts: this.t, role: 'assistant', agent, text: verdict ? `VERDICT: ${verdict}` : `${role} completed ${story || `phase ${phase}`}`,
    });
  }

  _modelFor(tier) {
    const env = this.modelConfig?.env || {};
    const requested = this._requestedFor(tier);
    // Tier illusion, simulated: an arm can declare tiering and silently fall back,
    // which is exactly the condition EFF-07 exists to detect.
    if (this.modelConfig?.mockTierFallback && tier !== 1) return env.ANYMAKE_MODEL_TIER1 || 'default';
    return requested;
  }
  _requestedFor(tier) {
    const env = this.modelConfig?.env || {};
    return env[`ANYMAKE_MODEL_TIER${tier}`] || 'default';
  }

  _commit(story, quality) {
    const bare = this.env.GH_SHIM_BARE;
    if (!bare || !fs.existsSync(bare)) return;
    const work = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'mock-work-'));
    const git = (args) => execFileSync('git', ['-C', work, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
      execFileSync('git', ['clone', '-q', bare, work], { stdio: 'ignore' });
      git(['config', 'user.email', 'eval@anymake.invalid']);
      git(['config', 'user.name', 'Anymake Eval']);
      let base = 'main';
      try { git(['checkout', '-q', base]); } catch { git(['checkout', '-q', '-b', base]); }
      const branch = `story/${story.id}`;
      git(['checkout', '-q', '-b', branch]);
      writeText(path.join(work, 'src', `story-${story.id}.js`), `export const story${story.id.replace('.', '_')} = () => 'ok';\n`);
      writeText(path.join(work, 'test', `story-${story.id}.test.js`), `import assert from 'assert';\nassert.ok(true);\n`);
      git(['add', '-A']);
      git(['commit', '-q', '-m', `feat(story-${story.id}): implement ${story.title}`]);
      git(['push', '-q', 'origin', branch]);
      // The gh shim is what merges: the run goes through a PR, exactly as the rules require.
      const gh = path.join(this.arena, 'bin', 'gh');
      if (fs.existsSync(gh)) {
        execFileSync(gh, ['pr', 'create', '--title', `feat: story ${story.id}`, '--body', `Closes #${story.id}`, '--head', branch],
          { env: this.env, stdio: 'ignore' });
        try { execFileSync(gh, ['pr', 'merge', branch], { env: this.env, stdio: 'ignore' }); } catch {}
      }
    } catch { /* a mock commit failure is not a finding about anything */ }
    finally { fs.rmSync(work, { recursive: true, force: true }); }
  }

  _writeArtifacts(projectDir, stories, quality, has = () => true) {
    const placeholder = quality < 0.8 ? '\n- [Specific, testable criterion]\n- TODO: fill in\n' : '\n- The user can complete the flow end to end.\n';
    writeText(path.join(projectDir, 'PROJECT.md'), `# Demo\n\n## Never Building\n- billing\n`);
    writeText(path.join(projectDir, 'docs', '02-planning', 'prd.md'), `# PRD\n\n## Requirements${placeholder}`);
    writeText(path.join(projectDir, 'docs', '03-solutioning', 'epics.md'),
      `# Epics\n\n${stories.map((s) => `### Story ${s.id}\n\n#### Acceptance criteria${placeholder}`).join('\n')}`);
    for (const s of stories) {
      writeText(path.join(projectDir, 'docs', '04-implementation', `task-brief-story-${s.id}.md`),
        `# Task brief — story ${s.id}\n\n## 3a Experience scenario\n1. Run the command\n2. Observe the output\n\n## 4 Test\n- unit\n`);
      // An ablated stage writes no artifacts. Getting this wrong is what the
      // ablation's trace assertion is for — and it caught it here during the build.
      if (has('validator')) {
        writeText(path.join(projectDir, 'validation-reports', `validation-report-story-${s.id}.md`),
          `# Validation — ${s.id}\n\nVERDICT: PASS\n`);
      }
      if (has('experience-runner')) {
        const na = this.rand() > quality + 0.05;
        writeText(path.join(projectDir, 'experience-reports', `experience-report-story-${s.id}.md`),
          na ? `# Experience — ${s.id}\n\nVERDICT: N/A\n`
             : `# Experience — ${s.id}\n\nVERDICT: PASS\n\n1. Ran the command\n2. Saw the output\n3. Checked the exit code\n`);
      }
    }
  }

  _writeBoardMd(projectDir, stories, gapStories) {
    const rows = stories.map((s) => `| ${s.id} | ${s.title} | ${s.status} |`).join('\n');
    writeText(path.join(projectDir, 'BOARD.md'),
      `# Board\n\n| Story | Title | Status |\n|---|---|---|\n${rows}\n\n`
      + `## Gate Decisions\n\n| Gate | Verdict | Notes |\n|---|---|---|\n`
      + `| Phase 1 | APPROVED | |\n| Phase 2 | APPROVED | |\n| Phase 3 | APPROVED | |\n\n`
      + `## Run Log\n\n${stories.map((s) => `- DISPATCH anymake-worker story ${s.id}`).join('\n')}\n`);
  }
}
