// Anymake regression harness.
//
// This repo is markdown-as-source-of-truth (ADR-008): no build step, no runtime,
// no test suite. This script IS the regression check. It exercises the plugin's
// hooks the way OpenCode would, validates that every skill is discoverable with
// valid frontmatter, and — critically — checks the instruction files against
// each other and against the templates they reference, so a broken
// cross-reference fails in CI instead of during a live build loop.
//
// Run: node .opencode/verify-plugin.mjs   (or `npm run verify`)
// CI:  .github/workflows/verify.yml runs this on every push and PR.
//
// When you fix an instruction bug, add the assertion that would have caught it.
import fs from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnymakePlugin } from './plugins/anymake.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

let failures = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failures++; };

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: match[2] };
};

// 1. Discover every skill folder the way OpenCode would (skills/*/SKILL.md)
console.log('\n[1] Skill discovery + frontmatter');
const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();
const seenNames = new Set();
for (const dir of dirs) {
  const p = path.join(SKILLS_DIR, dir, 'SKILL.md');
  if (!fs.existsSync(p)) { bad(`${dir}/ has no SKILL.md`); continue; }
  const parsed = parseFrontmatter(fs.readFileSync(p, 'utf8'));
  if (!parsed) { bad(`${dir}/SKILL.md has no parseable frontmatter`); continue; }
  const { fm } = parsed;
  if (!fm.name) bad(`${dir}: missing 'name'`);
  else if (fm.name !== dir) bad(`${dir}: name '${fm.name}' != folder '${dir}'`);
  else if (seenNames.has(fm.name)) bad(`${dir}: duplicate name '${fm.name}'`);
  else { seenNames.add(fm.name); }
  if (!fm.description) bad(`${dir}: missing 'description'`);
  else if (fm.description.length < 40) bad(`${dir}: description suspiciously short`);
  if (fm.name === dir && fm.description) ok(`${dir} → name+description valid (${fm.description.length} chars)`);
}

// 2. config hook registers the skills directory
console.log('\n[2] plugin config() hook registers skills path');
const plugin = await AnymakePlugin({ client: {}, directory: ROOT });
const cfg = {};
await plugin.config(cfg);
if (cfg.skills?.paths?.includes(SKILLS_DIR)) ok(`skills.paths includes ${path.relative(ROOT, SKILLS_DIR)}/`);
else bad(`skills.paths did not include the skills dir: ${JSON.stringify(cfg)}`);

// 3. transform hook injects the hub bootstrap into the first user message
console.log('\n[3] plugin transform() hook injects hub bootstrap');
const output = { messages: [{ info: { role: 'user' }, parts: [{ type: 'text', text: 'Start a new project' }] }] };
await plugin['experimental.chat.messages.transform']({}, output);
const injected = output.parts || output.messages[0].parts;
const first = output.messages[0].parts[0];
if (first?.text?.includes('EXTREMELY_IMPORTANT')) ok('bootstrap injected into first user message');
else bad('bootstrap NOT injected');
if (first?.text?.includes('You have the Anymake skill loaded')) ok('bootstrap contains hub skill body');
else bad('bootstrap missing hub skill body');
if (first?.text?.includes('Companion Skills')) ok('bootstrap carries the new Companion Skills section');
else bad('bootstrap missing Companion Skills section (hub edit not picked up)');

// 3b. double-injection guard
const before = output.messages[0].parts.length;
await plugin['experimental.chat.messages.transform']({}, output);
if (output.messages[0].parts.length === before) ok('double-injection guard holds');
else bad('bootstrap injected twice');

// 4. every companion the hub names actually exists as a discoverable skill
console.log('\n[4] hub references resolve to real skills');
const hub = fs.readFileSync(path.join(SKILLS_DIR, 'anymake', 'SKILL.md'), 'utf8');
const named = [...hub.matchAll(/`(anymake-[a-z-]+)`/g)].map((m) => m[1]);
const uniqueNamed = [...new Set(named)];
for (const n of uniqueNamed) {
  if (seenNames.has(n)) ok(`hub references ${n} → skill exists`);
  else bad(`hub references ${n} → NO such skill folder`);
}

// 5. companion path references point at files that exist
console.log('\n[5] companion path references resolve on disk');
for (const dir of dirs) {
  if (dir === 'anymake') continue;
  const body = fs.readFileSync(path.join(SKILLS_DIR, dir, 'SKILL.md'), 'utf8');
  const refs = [...body.matchAll(/`((?:AGENTS|TEMPLATES|PROJECT_TYPES|PHASE_GUIDES)\/[A-Za-z0-9_./<>-]+)`/g)]
    .map((m) => m[1]).filter((r) => !r.includes('<') && !r.endsWith('/'));
  let missing = 0;
  for (const r of [...new Set(refs)]) {
    if (!fs.existsSync(path.join(ROOT, r))) { bad(`${dir}: references missing ${r}`); missing++; }
  }
  if (missing === 0) ok(`${dir}: all ${new Set(refs).size} path references resolve`);
}

// 6. AGENTS/*.md subagent frontmatter + config.agent registration (model tiers)
console.log('\n[6] Agent discovery + model-tier registration');
const AGENTS_DIR = path.join(ROOT, 'AGENTS');
const agentFiles = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
const seenAgentNames = new Set();
let subagentCount = 0;
for (const file of agentFiles) {
  const raw = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const parsed = parseFrontmatter(raw);
  if (file === 'arbiter.md' || file === 'orchestrator.md') {
    if (!parsed) ok(`${file}: no frontmatter (expected — not spawned as a subagent)`);
    else bad(`${file}: unexpectedly has frontmatter — this file should never be spawned`);
    continue;
  }
  if (!parsed) { bad(`${file}: missing frontmatter (every spawned agent needs mode: subagent)`); continue; }
  const { fm } = parsed;
  if (fm.mode !== 'subagent') { bad(`${file}: mode is '${fm.mode}', expected 'subagent'`); continue; }
  if (!fm.name) { bad(`${file}: missing 'name'`); continue; }
  if (seenAgentNames.has(fm.name)) { bad(`${file}: duplicate agent name '${fm.name}'`); continue; }
  seenAgentNames.add(fm.name);
  if (!fm.description) bad(`${file}: missing 'description'`);
  if (!['1', '2', '3'].includes(fm.tier)) { bad(`${file}: tier '${fm.tier}' is not 1, 2, or 3`); continue; }
  ok(`${file} → ${fm.name} (tier ${fm.tier})`);
  subagentCount++;
}

console.log('\n[6b] plugin registers agents into config.agent, tier env vars bind models');
process.env.ANYMAKE_MODEL_TIER1 = 'anthropic/claude-opus-5';
process.env.ANYMAKE_MODEL_TIER2 = 'anthropic/claude-sonnet-5';
process.env.ANYMAKE_MODEL_TIER3 = 'anthropic/claude-haiku-4-5';
const agentPlugin = await AnymakePlugin({ client: {}, directory: ROOT });
const agentCfg = {};
await agentPlugin.config(agentCfg);
const registered = Object.keys(agentCfg.agent || {});
if (registered.length === subagentCount) ok(`config.agent has all ${subagentCount} discovered subagents`);
else bad(`config.agent has ${registered.length} entries, expected ${subagentCount}: ${JSON.stringify(registered)}`);
for (const name of registered) {
  const entry = agentCfg.agent[name];
  if (entry.mode !== 'subagent') bad(`${name}: mode is '${entry.mode}'`);
  if (!entry.prompt || entry.prompt.trimStart().startsWith('---') || entry.prompt.includes('\nmode: subagent')) bad(`${name}: prompt missing or frontmatter not stripped`);
  if (!entry.model) bad(`${name}: no model bound even though tier env vars are set`);
}
if (agentCfg.agent?.['anymake-worker']?.model === 'anthropic/claude-haiku-4-5') ok('anymake-worker (tier 3) bound to ANYMAKE_MODEL_TIER3');
else bad(`anymake-worker model mismatch: ${JSON.stringify(agentCfg.agent?.['anymake-worker'])}`);

console.log('\n[6c] a user opencode.json override wins per-field, without redeclaring the whole agent');
const overrideCfg = { agent: { 'anymake-worker': { model: 'custom/override-model' } } };
await agentPlugin.config(overrideCfg);
const overridden = overrideCfg.agent['anymake-worker'];
if (overridden.model === 'custom/override-model') ok('user-supplied model wins over the tier-resolved default');
else bad(`user override did not win: ${JSON.stringify(overridden)}`);
if (overridden.mode === 'subagent' && overridden.prompt) ok('plugin still supplied mode + prompt — user did not have to redeclare them');
else bad(`plugin fields missing after merge: ${JSON.stringify(overridden)}`);

delete process.env.ANYMAKE_MODEL_TIER1;
delete process.env.ANYMAKE_MODEL_TIER2;
delete process.env.ANYMAKE_MODEL_TIER3;

// 7. anymake-dispatch skill exists, is referenced from the hub + orchestrator,
//    and contains the canonical DISPATCH shape + WRITE THE FILE FIRST marker
//    (INV-018: all dispatch goes through the seam)
console.log('\n[7] anymake-dispatch skill: exists, referenced, canonical shape present');
const dispatchSkillPath = path.join(SKILLS_DIR, 'anymake-dispatch', 'SKILL.md');
if (!fs.existsSync(dispatchSkillPath)) {
  bad('skills/anymake-dispatch/SKILL.md does not exist');
} else {
  const dispatchBody = fs.readFileSync(dispatchSkillPath, 'utf8');
  const dispatchParsed = parseFrontmatter(dispatchBody);
  // (a) frontmatter valid
  if (!dispatchParsed) { bad('anymake-dispatch/SKILL.md has no frontmatter'); }
  else if (dispatchParsed.fm.name !== 'anymake-dispatch') { bad(`anymake-dispatch: name is '${dispatchParsed.fm.name}', expected 'anymake-dispatch'`); }
  else if (!dispatchParsed.fm.description || dispatchParsed.fm.description.length < 40) { bad('anymake-dispatch: description missing or < 40 chars'); }
  else ok('anymake-dispatch/SKILL.md: frontmatter valid');
  // (b) canonical DISPATCH request shape present
  if (dispatchBody.includes('DISPATCH {') && dispatchBody.includes('agent:') && dispatchBody.includes('output_artifact:') && dispatchBody.includes('output_check:')) {
    ok('anymake-dispatch: canonical DISPATCH request shape present');
  } else {
    bad('anymake-dispatch: missing canonical DISPATCH request shape (expected DISPATCH { ... agent: ... output_artifact: ... output_check: ...)');
  }
  // (c) WRITE THE FILE FIRST pre-prompt marker present
  if (dispatchBody.includes('WRITE THE FILE FIRST')) {
    ok('anymake-dispatch: WRITE THE FILE FIRST pre-prompt marker present');
  } else {
    bad('anymake-dispatch: missing WRITE THE FILE FIRST marker');
  }
  // (d) RETRY CONTEXT canonical block present
  if (dispatchBody.includes('RETRY CONTEXT') && dispatchBody.includes("Trigger:")) {
    ok('anymake-dispatch: RETRY CONTEXT canonical block present');
  } else {
    bad('anymake-dispatch: missing RETRY CONTEXT canonical block');
  }
  // (e) Backend section present (host-portability seam)
  if (dispatchBody.includes('Backend: OpenCode')) {
    ok('anymake-dispatch: Backend adapter section present (host-portability seam)');
  } else {
    bad('anymake-dispatch: missing Backend adapter section');
  }
}
// (f) hub references anymake-dispatch
const hubBody = fs.readFileSync(path.join(SKILLS_DIR, 'anymake', 'SKILL.md'), 'utf8');
if (hubBody.includes('anymake-dispatch')) {
  ok('hub skills/anymake/SKILL.md references anymake-dispatch');
} else {
  bad('hub skills/anymake/SKILL.md does NOT reference anymake-dispatch (companion table missing the row)');
}
// (g) skills/README.md references anymake-dispatch
const readmeBody = fs.readFileSync(path.join(SKILLS_DIR, 'README.md'), 'utf8');
if (readmeBody.includes('anymake-dispatch')) {
  ok('skills/README.md companion map references anymake-dispatch');
} else {
  bad('skills/README.md companion map does NOT reference anymake-dispatch');
}
// (h) orchestrator references anymake-dispatch (the contract that rewiring happened — Story 27.2a)
const orchestratorPath = path.join(ROOT, 'AGENTS', 'orchestrator.md');
if (fs.existsSync(orchestratorPath)) {
  const orchBody = fs.readFileSync(orchestratorPath, 'utf8');
  if (orchBody.includes('anymake-dispatch')) {
    ok('AGENTS/orchestrator.md references anymake-dispatch (rewiring done)');
  } else {
    bad('AGENTS/orchestrator.md does NOT reference anymake-dispatch (INV-018 violation — dispatch sites still use raw Agent calls)');
  }
  // (i) no raw Agent({ calls remain in orchestrator (INV-018 proof)
  const rawAgentCalls = orchBody.match(/Agent\(\{/g);
  if (rawAgentCalls && rawAgentCalls.length > 0) {
    bad(`AGENTS/orchestrator.md still has ${rawAgentCalls.length} raw Agent({ calls (INV-018 violation — must route through anymake-dispatch)`);
  } else {
    ok('AGENTS/orchestrator.md has zero raw Agent({ calls (all dispatch routed through anymake-dispatch)');
  }
}
// (j) prose-verb dispatch sites reference anymake-dispatch (Story 27.2b rewire)
const proseFiles = [
  { path: path.join(SKILLS_DIR, 'anymake-agile', 'SKILL.md'), name: 'skills/anymake-agile/SKILL.md' },
  { path: path.join(SKILLS_DIR, 'anymake', 'SKILL.md'), name: 'skills/anymake/SKILL.md (hub)' },
  { path: path.join(ROOT, 'PHASE_GUIDES', 'phase-0.md'), name: 'PHASE_GUIDES/phase-0.md' },
  { path: path.join(ROOT, 'PHASE_GUIDES', 'phase-1.md'), name: 'PHASE_GUIDES/phase-1.md' },
  { path: path.join(ROOT, 'PHASE_GUIDES', 'phase-2.md'), name: 'PHASE_GUIDES/phase-2.md' },
  { path: path.join(ROOT, 'PHASE_GUIDES', 'phase-3.md'), name: 'PHASE_GUIDES/phase-3.md' },
  { path: path.join(ROOT, 'PHASE_GUIDES', 'phase-4.md'), name: 'PHASE_GUIDES/phase-4.md' },
];
for (const f of proseFiles) {
  if (!fs.existsSync(f.path)) { bad(`${f.name}: file not found`); continue; }
  const body = fs.readFileSync(f.path, 'utf8');
  if (body.includes('anymake-dispatch')) {
    ok(`${f.name} references anymake-dispatch (prose-verb rewire done)`);
  } else {
    bad(`${f.name} does NOT reference anymake-dispatch (INV-018 violation — dispatch sites still use raw 'spawn' verbs)`);
  }
  // (k) no raw Agent({ calls remain in any phase guide or skill file (INV-018 proof)
  const rawCalls = body.match(/Agent\(\{/g);
  if (rawCalls && rawCalls.length > 0) {
    bad(`${f.name} still has ${rawCalls.length} raw Agent({ calls (INV-018 violation — must route through anymake-dispatch)`);
  }
}

// 8. Worktree isolation (B1 / #16 / Story 29.1) — dispatch skill has populated
//    workspace-setup section; worker.md references the worktree convention
console.log('\n[8] Worktree isolation (B1 / #16)');
{
  const dispatchBody = fs.readFileSync(dispatchSkillPath, 'utf8');
  // (a) workspace-setup section is populated (no longer "future extension point")
  if (dispatchBody.includes('git worktree add') && dispatchBody.includes('.anymake/worktrees/story-N.N')) {
    ok('anymake-dispatch: workspace-setup section documents worktree add + path convention');
  } else {
    bad('anymake-dispatch: workspace-setup section missing worktree add command or path convention');
  }
  if (dispatchBody.includes('DISPATCH.project_root') && dispatchBody.includes('worktree path')) {
    ok('anymake-dispatch: workspace-setup states DISPATCH.project_root is the worktree path');
  } else {
    bad('anymake-dispatch: workspace-setup does not reassign DISPATCH.project_root to worktree path');
  }
  if (!dispatchBody.includes('future extension point')) {
    ok('anymake-dispatch: workspace-setup no longer a no-op "future extension point"');
  } else {
    bad('anymake-dispatch: workspace-setup still says "future extension point" (slot not filled)');
  }
  // (b) worker.md references worktree convention, no git checkout -b on shared checkout
  const workerBody = fs.readFileSync(path.join(AGENTS_DIR, 'worker.md'), 'utf8');
  if (workerBody.includes('worktree') && workerBody.includes('.anymake/worktrees/story-N.N')) {
    ok('AGENTS/worker.md references worktree convention');
  } else {
    bad('AGENTS/worker.md does not reference worktree convention');
  }
  // The instruction "Do not run git checkout -b" is a prohibition, not an
  // instruction to run it. Check for the instruction form only (bash code
  // block with git checkout -b as a command, not a prohibition in prose).
  const checkoutInstr = workerBody.match(/```bash\n[^]*git checkout -b/m) || workerBody.match(/^\s*git checkout -b/m);
  if (!checkoutInstr) {
    ok('AGENTS/worker.md: no git checkout -b instruction (branch created by worktree add)');
  } else {
    bad('AGENTS/worker.md still instructs git checkout -b on shared checkout');
  }
  // (c) orchestrator.md documents worktree creation + removal
  const orchBody = fs.readFileSync(orchestratorPath, 'utf8');
  if (orchBody.includes('git worktree add') && orchBody.includes('git worktree remove')) {
    ok('AGENTS/orchestrator.md: worktree creation + removal documented');
  } else {
    bad('AGENTS/orchestrator.md: missing worktree creation or removal lifecycle');
  }
}

// 9. Shared taskboard JSON (Story 29.2) — board-state.schema.json exists and
//    parses; BOARD.md + orchestrator.md reference board-state.json; agents
//    document event appending; dispatch skill dual-writes
console.log('\n[9] Shared taskboard JSON (the spine)');
{
  const schemaPath = path.join(ROOT, 'TEMPLATES', 'board-state.schema.json');
  if (!fs.existsSync(schemaPath)) {
    bad('TEMPLATES/board-state.schema.json does not exist');
  } else {
    try {
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      if (schema.title && schema.type === 'object' && schema.properties) {
        ok('TEMPLATES/board-state.schema.json: valid JSON Schema');
      } else {
        bad('TEMPLATES/board-state.schema.json: not a valid JSON Schema object');
      }
      // Check required fields exist in schema
      const req = schema.required || [];
      const needed = ['project', 'run_id', 'updated', 'concurrency', 'in_flight', 'stories', 'events'];
      const missing = needed.filter((f) => !req.includes(f));
      if (missing.length === 0) {
        ok('TEMPLATES/board-state.schema.json: all required fields present (' + needed.join(', ') + ')');
      } else {
        bad('TEMPLATES/board-state.schema.json: missing required fields: ' + missing.join(', '));
      }
      // Check stories[] has the expected fields
      const storyProps = schema.properties?.stories?.items?.properties || {};
      const storyFields = ['id', 'title', 'milestone', 'status', 'branch', 'worktree', 'pr', 'retries', 'touches_files', 'depends_on'];
      const missingStory = storyFields.filter((f) => !storyProps[f]);
      if (missingStory.length === 0) {
        ok('TEMPLATES/board-state.schema.json: stories[] has all expected fields');
      } else {
        bad('TEMPLATES/board-state.schema.json: stories[] missing fields: ' + missingStory.join(', '));
      }
      // Check events[] has the expected fields
      const eventProps = schema.properties?.events?.items?.properties || {};
      const eventFields = ['ts', 'story', 'agent', 'type', 'from', 'to', 'detail'];
      const missingEvent = eventFields.filter((f) => !eventProps[f]);
      if (missingEvent.length === 0) {
        ok('TEMPLATES/board-state.schema.json: events[] has all expected fields');
      } else {
        bad('TEMPLATES/board-state.schema.json: events[] missing fields: ' + missingEvent.join(', '));
      }
      // §9 extension (ADR-013): session object + new enum values + nullable story + optional fields
      const sessProps = schema.properties?.session?.properties || {};
      if (schema.properties?.session && sessProps.id && sessProps.started && sessProps.phase && sessProps.step) {
        ok('TEMPLATES/board-state.schema.json: top-level `session` object present (id/started/phase/step)');
      } else {
        bad('TEMPLATES/board-state.schema.json: missing top-level `session` object or sub-properties (ADR-013)');
      }
      if (!schema.required?.includes('session')) {
        ok('TEMPLATES/board-state.schema.json: `session` is optional (not in required — backward compat)');
      } else {
        bad('TEMPLATES/board-state.schema.json: `session` should NOT be in required (backward compat)');
      }
      const evType = schema.properties?.events?.items?.properties?.type;
      if (evType && evType.enum) {
        const newTypes = ['session_start', 'session_end', 'phase_step', 'artifact', 'checkpoint', 'escalation'];
        const missingTypes = newTypes.filter((t) => !evType.enum.includes(t));
        if (missingTypes.length === 0) {
          ok('TEMPLATES/board-state.schema.json: events[].type enum includes all 6 session-lifecycle types');
        } else {
          bad('TEMPLATES/board-state.schema.json: events[].type enum missing session types: ' + missingTypes.join(', '));
        }
        // verify existing 10 types untouched
        const existingTypes = ['status_change', 'dispatch', 'dispatch_ok', 'dispatch_fail', 'retry', 'escalate', 'heartbeat', 'log', 'worktree_create', 'worktree_cleanup'];
        const missingExisting = existingTypes.filter((t) => !evType.enum.includes(t));
        if (missingExisting.length === 0) {
          ok('TEMPLATES/board-state.schema.json: all 10 existing build-loop event types preserved');
        } else {
          bad('TEMPLATES/board-state.schema.json: existing event types missing: ' + missingExisting.join(', '));
        }
      } else {
        bad('TEMPLATES/board-state.schema.json: events[].type has no enum');
      }
      // nullable story
      const storyType = schema.properties?.events?.items?.properties?.story?.type;
      if (Array.isArray(storyType) && storyType.includes('string') && storyType.includes('null')) {
        ok('TEMPLATES/board-state.schema.json: events[].story allows null (session events have story: null)');
      } else {
        bad('TEMPLATES/board-state.schema.json: events[].story should allow ["string","null"]');
      }
      // optional session + artifact on events
      if (eventProps.session && eventProps.artifact) {
        ok('TEMPLATES/board-state.schema.json: events[] has optional `session` + `artifact` fields');
      } else {
        bad('TEMPLATES/board-state.schema.json: events[] missing optional `session` or `artifact` field');
      }
      // orchestrator reconcile allow-list clause (ADR-013)
      const orchBody = fs.readFileSync(orchestratorPath, 'utf8');
      if (orchBody.includes('Reconcile allow-list') && orchBody.includes('Session-lifecycle events') && orchBody.includes('never story-status transitions')) {
        ok('AGENTS/orchestrator.md: reconcile allow-list clause present (ADR-013 defense-in-depth)');
      } else {
        bad('AGENTS/orchestrator.md: missing reconcile allow-list clause (ADR-013)');
      }
    } catch (e) {
      bad('TEMPLATES/board-state.schema.json: not valid JSON (' + e.message + ')');
    }
  }
  // BOARD.md references board-state.json
  const boardBody = fs.readFileSync(path.join(ROOT, 'TEMPLATES', 'BOARD.md'), 'utf8');
  if (boardBody.includes('board-state.json')) {
    ok('TEMPLATES/BOARD.md references board-state.json (reconciliation contract)');
  } else {
    bad('TEMPLATES/BOARD.md does not reference board-state.json');
  }
  // Orchestrator references board-state.json
  const orchBody = fs.readFileSync(orchestratorPath, 'utf8');
  if (orchBody.includes('board-state.json')) {
    ok('AGENTS/orchestrator.md references board-state.json (reconcile step)');
  } else {
    bad('AGENTS/orchestrator.md does not reference board-state.json');
  }
  // Workers, validators, experience runners document event appending
  const workerBody = fs.readFileSync(path.join(AGENTS_DIR, 'worker.md'), 'utf8');
  const validatorBody = fs.readFileSync(path.join(AGENTS_DIR, 'validator.md'), 'utf8');
  const expRunnerBody = fs.readFileSync(path.join(AGENTS_DIR, 'experience-runner.md'), 'utf8');
  for (const [name, body] of [['worker.md', workerBody], ['validator.md', validatorBody], ['experience-runner.md', expRunnerBody]]) {
    if (body.includes('board-state.json') && body.includes('events[]')) {
      ok(`AGENTS/${name} documents appending to board-state.json events[]`);
    } else {
      bad(`AGENTS/${name} does not document appending to board-state.json events[]`);
    }
  }
  // Dispatch skill dual-writes
  const dispatchBody = fs.readFileSync(dispatchSkillPath, 'utf8');
  if (dispatchBody.includes('board-state.json') && dispatchBody.includes('dual write')) {
    ok('anymake-dispatch: dual-writes dispatch log to BOARD.md + board-state.json');
  } else {
    bad('anymake-dispatch: does not dual-write to board-state.json');
  }
}

// 10. Parallel dispatch + orchestrator-as-team-lead (B2 / #17 / Story 29.3)
//     — dispatch_parallel documented, serialization rule deleted, concurrency
//     policy present, planner documents touches_files
console.log('\n[10] Parallel dispatch + orchestrator-as-team-lead (B2 / #17)');
{
  const dispatchBody = fs.readFileSync(dispatchSkillPath, 'utf8');
  if (dispatchBody.includes('dispatch_parallel') && dispatchBody.includes('concurrently')) {
    ok('anymake-dispatch: dispatch_parallel mode documented');
  } else {
    bad('anymake-dispatch: dispatch_parallel mode not documented');
  }
  const orchBody = fs.readFileSync(orchestratorPath, 'utf8');
  // Negative check: serialization rule is GONE
  if (!orchBody.includes('Do not spawn more than one planner, one worker, or one validator at a time')) {
    ok('AGENTS/orchestrator.md: serialization rule deleted (parallel is default)');
  } else {
    bad('AGENTS/orchestrator.md: serialization rule still present (INV-018 / Story 29.3 violation)');
  }
  // Positive check: concurrency policy present
  if (orchBody.includes('Concurrency policy') && orchBody.includes('concurrency.max') && orchBody.includes('touches_files')) {
    ok('AGENTS/orchestrator.md: concurrency policy + conflict detection documented');
  } else {
    bad('AGENTS/orchestrator.md: missing concurrency policy or conflict detection');
  }
  // Team-lead loop present
  if (orchBody.includes('team-lead loop') || orchBody.includes('Team-Lead Loop') || orchBody.includes('Team-lead loop')) {
    ok('AGENTS/orchestrator.md: team-lead loop documented');
  } else {
    bad('AGENTS/orchestrator.md: team-lead loop not documented');
  }
  // max=1 fallback documented
  if (orchBody.includes('max=1') || orchBody.includes('max = 1')) {
    ok('AGENTS/orchestrator.md: max=1 fallback documented (reproduces sequential behavior)');
  } else {
    bad('AGENTS/orchestrator.md: max=1 fallback not documented');
  }
  // Arbiter: concurrency-aware retry note
  const arbBody = fs.readFileSync(path.join(AGENTS_DIR, 'arbiter.md'), 'utf8');
  if (arbBody.includes('Concurrency-aware retry') && arbBody.includes('per-story')) {
    ok('AGENTS/arbiter.md: concurrency-aware retry note present');
  } else {
    bad('AGENTS/arbiter.md: concurrency-aware retry note missing');
  }
  // Planner: touches_files documented
  const plannerBody = fs.readFileSync(path.join(AGENTS_DIR, 'planner.md'), 'utf8');
  if (plannerBody.includes('touches_files')) {
    ok('AGENTS/planner.md: touches_files emission documented');
  } else {
    bad('AGENTS/planner.md: touches_files emission not documented');
  }
  // Build-loop skill: parallel awareness
  const buildLoopBody = fs.readFileSync(path.join(SKILLS_DIR, 'anymake-build-loop', 'SKILL.md'), 'utf8');
  if (buildLoopBody.includes('concurrency') && buildLoopBody.includes('non-conflicting')) {
    ok('skills/anymake-build-loop/SKILL.md: parallel dispatch awareness present');
  } else {
    bad('skills/anymake-build-loop/SKILL.md: parallel dispatch awareness missing');
  }
}

// 11. Zero-build kanban monitor (Story 29.4) — dashboard/kanban.html exists,
//     is single-file (no external src/href), has 7 columns + polling fetch
console.log('\n[11] Zero-build kanban monitor');
{
  const kanbanPath = path.join(ROOT, 'dashboard', 'kanban.html');
  if (!fs.existsSync(kanbanPath)) {
    bad('dashboard/kanban.html does not exist');
  } else {
    const kb = fs.readFileSync(kanbanPath, 'utf8');
    // (a) single-file: no external <script src=> or <link href=>
    const extScript = kb.match(/<script\s+[^>]*src=/i);
    const extLink = kb.match(/<link\s+[^>]*href=/i);
    const extImport = kb.match(/import\s+["']/);
    if (!extScript && !extLink && !extImport) {
      ok('dashboard/kanban.html: single-file (no external src/href/import)');
    } else {
      if (extScript) bad('dashboard/kanban.html: has external <script src=> (violates ADR-008)');
      if (extLink) bad('dashboard/kanban.html: has external <link href=> (violates ADR-008)');
      if (extImport) bad('dashboard/kanban.html: has bare import (violates ADR-008)');
    }
    // (b) Every story status in the schema has a column. Derived from
    //     board-state.schema.json, NOT hardcoded — a status added to the schema
    //     without a matching column now fails CI instead of silently vanishing
    //     from the board. (`awaiting_review` — the one state where a human is
    //     supposed to be watching — was missing exactly this way.)
    const schemaForCols = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'TEMPLATES', 'board-state.schema.json'), 'utf8'));
    const statusEnum =
      schemaForCols.properties.stories.items.properties.status.enum;
    // Parse the COLUMNS array's declared keys rather than substring-matching the
    // whole file: 'experience' appears in kanban.html for other reasons too.
    const columnsBlock = kb.match(/var COLUMNS = \[([\s\S]*?)\];/)?.[1] || '';
    const declaredCols = [...columnsBlock.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
    const missingCols = statusEnum.filter((k) => !declaredCols.includes(k));
    const extraCols = declaredCols.filter((k) => !statusEnum.includes(k));
    if (missingCols.length === 0 && extraCols.length === 0) {
      ok(`dashboard/kanban.html: a column for every one of the schema's ${statusEnum.length} story statuses`);
    } else {
      if (missingCols.length) bad('dashboard/kanban.html: schema statuses with no column: ' + missingCols.join(', '));
      if (extraCols.length) bad('dashboard/kanban.html: columns with no matching schema status: ' + extraCols.join(', '));
    }
    // (b2) BOARD.md's Status Legend must cover the same set, so the markdown
    //      projection and the JSON spine never drift apart either.
    const boardTmpl = fs.readFileSync(path.join(ROOT, 'TEMPLATES', 'BOARD.md'), 'utf8');
    const legendGaps = statusEnum.filter((k) => {
      const label = k.replace(/_/g, ' ');
      // Prefix match: the legend may use a longer human label
      // ('experience' -> 'Experience Check').
      return !new RegExp(`\\| ${label}\\b`, 'i').test(boardTmpl);
    });
    if (legendGaps.length === 0) {
      ok('TEMPLATES/BOARD.md: Status Legend covers every schema story status');
    } else {
      bad('TEMPLATES/BOARD.md: Status Legend missing: ' + legendGaps.join(', '));
    }
    // (c) polling fetch present (setInterval or self-scheduling setTimeout with backoff)
    if (kb.includes('fetch(') && (kb.includes('setInterval') || kb.includes('setTimeout'))) {
      ok('dashboard/kanban.html: polling fetch present');
    } else {
      bad('dashboard/kanban.html: missing polling fetch or setInterval/setTimeout');
    }
    // (d) read-only (no write controls — no POST, no PUT, no fetch with method: 'POST')
    if (!/method:\s*['"](?:POST|PUT|PATCH|DELETE)/.test(kb)) {
      ok('dashboard/kanban.html: read-only (no write methods)');
    } else {
      bad('dashboard/kanban.html: has write methods (must be read-only)');
    }
    // (e) dark aesthetic
    if (kb.includes('#0b0d10')) {
      ok('dashboard/kanban.html: dark aesthetic (#0b0d10 background)');
    } else {
      bad('dashboard/kanban.html: missing dark background (#0b0d10)');
    }
    // (f) drag-drop offline fallback
    if (kb.includes('dragover') && kb.includes('drop')) {
      ok('dashboard/kanban.html: drag-drop offline fallback present');
    } else {
      bad('dashboard/kanban.html: missing drag-drop offline fallback');
    }
    // (g) §11 extension (ADR-013): Session Activity panel + ?log= param
    if (kb.includes('session-log') && kb.includes('session-panel')) {
      ok('dashboard/kanban.html: Session Activity panel present (ADR-013)');
    } else {
      bad('dashboard/kanban.html: missing Session Activity panel (ADR-013)');
    }
    if (kb.includes("params.get('log')")) {
      ok('dashboard/kanban.html: reads ?log= URL param for session-log.jsonl path');
    } else {
      bad('dashboard/kanban.html: missing ?log= URL param reader');
    }
  }
  // README exists
  const readmePath = path.join(ROOT, 'dashboard', 'README.md');
  if (fs.existsSync(readmePath)) {
    ok('dashboard/README.md exists (launch instructions)');
  } else {
    bad('dashboard/README.md does not exist');
  }
}

// 12. Per-project dashboard launcher (Story C.1 / #31) — kanban.sh exists,
//     is executable, uses python3 http.server, binds 127.0.0.1, references
//     board-state.json + session-log.jsonl
console.log('\n[12] Per-project dashboard launcher (kanban.sh)');
{
  const kanbanShPath = path.join(ROOT, 'dashboard', 'kanban.sh');
  if (!fs.existsSync(kanbanShPath)) {
    bad('dashboard/kanban.sh does not exist');
  } else {
    const stat = fs.statSync(kanbanShPath);
    const isExec = !!(stat.mode & 0o111);
    if (isExec) {
      ok('dashboard/kanban.sh: is executable');
    } else {
      bad('dashboard/kanban.sh: not executable (chmod +x)');
    }
    const body = fs.readFileSync(kanbanShPath, 'utf8');
    if (body.includes('python3 -m http.server')) {
      ok('dashboard/kanban.sh: uses python3 -m http.server');
    } else {
      bad('dashboard/kanban.sh: missing python3 -m http.server');
    }
    if (body.includes('--bind 127.0.0.1')) {
      ok('dashboard/kanban.sh: binds 127.0.0.1 (localhost-only — no network exposure)');
    } else {
      bad('dashboard/kanban.sh: missing --bind 127.0.0.1 (security: would bind 0.0.0.0)');
    }
    if (body.includes('board-state.json') && body.includes('session-log.jsonl')) {
      ok('dashboard/kanban.sh: references board-state.json + session-log.jsonl');
    } else {
      bad('dashboard/kanban.sh: missing board-state.json or session-log.jsonl reference');
    }
    if (body.includes('mktemp -d') && body.includes('symlink')) {
      ok('dashboard/kanban.sh: uses temp root with symlinks (same-origin fetch solution)');
    } else {
      bad('dashboard/kanban.sh: missing temp-root-with-symlinks mechanism');
    }
  }
}

// 13. Hub session-event writer (Story B.2 / #31 / ADR-013) — SKILL.md
//     documents session-log.jsonl appending + writer split
console.log('\n[13] Hub session-event writer (ADR-013)');
{
  const hubBody = fs.readFileSync(path.join(SKILLS_DIR, 'anymake', 'SKILL.md'), 'utf8');
  if (hubBody.includes('session-log.jsonl')) {
    ok('skills/anymake/SKILL.md: documents session-log.jsonl');
  } else {
    bad('skills/anymake/SKILL.md: missing session-log.jsonl reference');
  }
  if (hubBody.includes('session_start') && hubBody.includes('phase_step')) {
    ok('skills/anymake/SKILL.md: documents session_start + phase_step event types');
  } else {
    bad('skills/anymake/SKILL.md: missing session_start or phase_step event instructions');
  }
  if (hubBody.includes('NEVER') && hubBody.includes('events[]') && hubBody.includes('writer split')) {
    ok('skills/anymake/SKILL.md: documents writer split (hub does NOT write events[])');
  } else {
    bad('skills/anymake/SKILL.md: missing writer-split statement (hub must NOT write events[])');
  }
}

// 14. RELEASE.md (Story A.1 / #31) — cache-invalidation procedure documented
console.log('\n[14] RELEASE.md (cache-invalidation procedure)');
{
  const releasePath = path.join(ROOT, 'RELEASE.md');
  if (!fs.existsSync(releasePath)) {
    bad('RELEASE.md does not exist at repo root');
  } else {
    const body = fs.readFileSync(releasePath, 'utf8');
    if (body.includes('node_modules/anymake') && (body.includes('mv') || body.includes('rm -rf'))) {
      ok('RELEASE.md: documents cache-invalidation (move-aside or rm -rf against cache path)');
    } else {
      bad('RELEASE.md: missing cache-invalidation procedure');
    }
    if (body.includes('verify-plugin.mjs')) {
      ok('RELEASE.md: documents pre-release verify-plugin.mjs green check');
    } else {
      bad('RELEASE.md: missing verify-plugin.mjs pre-check');
    }
    if (body.includes('restart') || body.includes('Restart')) {
      ok('RELEASE.md: documents OpenCode restart step');
    } else {
      bad('RELEASE.md: missing restart step');
    }
  }
}

// 15. Cross-reference integrity (remediation Phase 0) — every `output_check`
//     grep in a DISPATCH block is EXECUTED against the real template file the
//     dispatched agent writes. A check that can never match its own template is
//     a check that fails every valid deliverable, which is worse than no check:
//     it turns every success into a spurious retry/escalation.
//     This is what would have caught the three broken greps in the 2026-08-29
//     audit (`## §3a`, `## RESULT`, `verdict:`) and the `grep -c 'proxy'`
//     tautology.
console.log('\n[15] Cross-reference integrity (output_check greps run against real templates)');
{
  // Which template each dispatched agent's deliverable is shaped by. The
  // output_check must match against THIS file, because this is the file the
  // agent copies its structure from.
  const AGENT_TEMPLATE = {
    'anymake-planner': 'TEMPLATES/task-brief.md',
    'anymake-worker': 'TEMPLATES/task-brief.md',
    'anymake-validator': 'TEMPLATES/validation-report.md',
    'anymake-experience-runner': 'TEMPLATES/experience-report.md',
    'anymake-product-owner-proxy': 'TEMPLATES/BOARD.md',
    'anymake-cartographer': 'TEMPLATES/system-map.md',
    'anymake-solution-architect': 'TEMPLATES/dev-plan.md',
    'anymake-plan-reviewer': 'TEMPLATES/plan-review.md',
  };

  // Split a shell-ish command into argv, respecting single quotes. Trailing
  // `# comment` (outside quotes) is dropped.
  const tokenize = (cmd) => {
    const argv = [];
    let cur = '';
    let quoted = false;
    let started = false;
    for (let i = 0; i < cmd.length; i++) {
      const c = cmd[i];
      if (c === "'") { quoted = !quoted; started = true; continue; }
      if (!quoted && c === '#' && !started) break;          // start-of-token comment
      if (!quoted && /\s/.test(c)) {
        if (started) { argv.push(cur); cur = ''; started = false; }
        continue;
      }
      cur += c; started = true;
    }
    if (started) argv.push(cur);
    return argv;
  };

  // Collect (sourceFile, agent, output_check) triples from every DISPATCH block.
  const dispatchSources = [
    ...fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).map((f) => path.join('AGENTS', f)),
    ...fs.readdirSync(path.join(ROOT, 'PHASE_GUIDES')).filter((f) => f.endsWith('.md')).map((f) => path.join('PHASE_GUIDES', f)),
  ];
  const checks = [];
  for (const rel of dispatchSources) {
    const body = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // Each ```-fenced (or bare) DISPATCH { ... } block.
    for (const m of body.matchAll(/DISPATCH \{([\s\S]*?)\n\}/g)) {
      const block = m[1];
      const agent = block.match(/agent:\s*"([^"]+)"/)?.[1];
      const check = block.match(/output_check:\s*"([^"]+)"/)?.[1];
      const line = body.slice(0, m.index).split('\n').length;
      if (agent && check) checks.push({ rel, agent, check, line });
    }
  }

  if (checks.length === 0) {
    bad('cross-reference: found no DISPATCH blocks with an output_check — the parser is broken');
  } else {
    ok(`cross-reference: parsed ${checks.length} DISPATCH output_check(s) from ${dispatchSources.length} instruction files`);
  }

  for (const { rel, agent, check, line } of checks) {
    const tmplRel = AGENT_TEMPLATE[agent];
    if (!tmplRel) { bad(`${rel}:${line}: DISPATCH agent '${agent}' has no known deliverable template`); continue; }
    const tmplPath = path.join(ROOT, tmplRel);
    if (!fs.existsSync(tmplPath)) { bad(`${rel}:${line}: template ${tmplRel} does not exist`); continue; }

    if (!check.startsWith('grep')) {
      // Non-grep checks (wc -l, gh pr view, ls) can't be run against a template.
      ok(`${rel}:${line}: ${agent} — non-grep check, skipped ('${check.split(/\s+/)[0]}')`);
      continue;
    }
    // Substitute the <path ...> placeholder with the real template path.
    const cmd = check.replace(/<[^>]*>/g, tmplPath);
    const argv = tokenize(cmd);
    if (argv[0] !== 'grep') { bad(`${rel}:${line}: could not parse output_check: ${check}`); continue; }

    let count = 0;
    let ran = false;
    try {
      const out = execFileSync('grep', argv.slice(1), { encoding: 'utf8' });
      count = parseInt(out.trim().split('\n').pop(), 10) || 0;
      ran = true;
    } catch (e) {
      // grep exits 1 on "no match" — that is a real result, not an error.
      if (e.status === 1) { count = 0; ran = true; }
      else bad(`${rel}:${line}: output_check failed to execute (${e.message.split('\n')[0]}): ${check}`);
    }
    if (!ran) continue;
    if (count > 0) {
      ok(`${rel}:${line}: ${agent} — output_check matches ${tmplRel} (${count} hit${count === 1 ? '' : 's'})`);
    } else {
      bad(`${rel}:${line}: ${agent} — output_check NEVER matches its own template ${tmplRel}: ${check}`);
    }
  }

  // A check that matches ANY text on the page proves nothing about the outcome.
  // `grep -c 'proxy'` on BOARD.md was exactly this: a NEEDS CHANGES entry and an
  // APPROVED entry satisfy it identically.
  for (const { rel, check, line } of checks) {
    const pattern = check.match(/grep[^']*'([^']*)'/)?.[1];
    if (!pattern) continue;
    const TAUTOLOGICAL = ['proxy', 'decision', 'result', 'story', 'board'];
    if (TAUTOLOGICAL.includes(pattern.toLowerCase())) {
      bad(`${rel}:${line}: output_check '${pattern}' is a tautology — it cannot distinguish outcomes. Match a structured verdict token instead.`);
    }
  }
}

// 16. Stale-summary drift (remediation Phase 0) — an allow-listed set of named
//     assertions that the root AGENTS.md summary does not contradict the
//     detailed AGENTS/*.md files and schema it summarizes. This is deliberately
//     NOT general NLP: each entry names one topic, one trigger, and one
//     forbidden/required claim. Add an entry whenever a summary/detail
//     contradiction is found, so it can never come back silently.
console.log('\n[16] Stale-summary drift (AGENTS.md vs. the specs it summarizes)');
{
  const read = (rel) => {
    const p = path.join(ROOT, rel);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  };

  const DRIFT_ASSERTIONS = [
    {
      topic: 'concurrency model',
      // If the orchestrator makes parallel dispatch configurable...
      trigger: { file: 'AGENTS/orchestrator.md', contains: 'concurrency.max' },
      // ...AGENTS.md must not still claim stories are strictly serial.
      target: 'AGENTS.md',
      forbidden: [
        'never run two stories concurrently',
        'run two stories concurrently',
        'Running two Worker',
      ],
      why: 'AGENTS/orchestrator.md makes parallel story dispatch the default (concurrency.max, default 3). AGENTS.md must not contradict it.',
    },
    {
      topic: 'board-state.json in the Phase 4 summary',
      trigger: { file: 'TEMPLATES/board-state.schema.json', contains: 'in_flight' },
      target: 'AGENTS.md',
      required: ['board-state.json', 'worktree', 'concurrency'],
      why: 'The Phase 4 build loop runs on board-state.json + worktrees. AGENTS.md summarizing Phase 4 without naming them describes a model that no longer exists.',
    },
    {
      topic: 'precedence rule',
      trigger: { file: 'AGENTS.md', contains: 'AGENTS/' },
      target: 'AGENTS.md',
      required: ['the detailed file wins'],
      why: 'AGENTS.md must state that a detailed AGENTS/*.md file wins on conflict, so future one-sided edits fail safe instead of ambiguous.',
    },
    {
      topic: 'worker build order is manifest-derived',
      trigger: { file: 'AGENTS/worker.md', contains: 'build order' },
      target: 'AGENTS.md',
      required: ['manifest-derived'],
      why: 'The 7-layer build order is the SaaS default, not an invariant — AGENTS.md must qualify it at the point of the list.',
    },
    {
      topic: 'dispatch chokepoint',
      trigger: { file: 'skills/anymake-dispatch/SKILL.md', contains: 'INV-018' },
      target: 'AGENTS.md',
      required: ['anymake-dispatch'],
      why: 'INV-018 routes all dispatch through anymake-dispatch; the contract file must name the chokepoint.',
    },
    {
      topic: 'pronoun convention',
      trigger: { file: 'AGENTS.md', contains: 'you' },
      target: 'AGENTS.md',
      required: ['the real user'],
      why: '"You" addresses the agent being instructed; human approval must be written as "the user" / "the real user".',
    },
  ];

  for (const a of DRIFT_ASSERTIONS) {
    const trig = read(a.trigger.file);
    if (trig === null) { bad(`drift/${a.topic}: trigger file ${a.trigger.file} missing`); continue; }
    if (!trig.includes(a.trigger.contains)) {
      ok(`drift/${a.topic}: trigger not present in ${a.trigger.file} — assertion not applicable`);
      continue;
    }
    const body = read(a.target);
    if (body === null) { bad(`drift/${a.topic}: target file ${a.target} missing`); continue; }
    const lower = body.toLowerCase();
    let failed = false;
    for (const f of a.forbidden || []) {
      if (lower.includes(f.toLowerCase())) {
        bad(`drift/${a.topic}: ${a.target} still contains "${f}" — ${a.why}`);
        failed = true;
      }
    }
    for (const r of a.required || []) {
      if (!lower.includes(r.toLowerCase())) {
        bad(`drift/${a.topic}: ${a.target} does not mention "${r}" — ${a.why}`);
        failed = true;
      }
    }
    if (!failed) ok(`drift/${a.topic}: ${a.target} consistent with ${a.trigger.file}`);
  }
}

// 17. Kanban render against a real fixture (remediation Phase 1 exit criterion).
//     Runs the dashboard's actual column-filter logic over a hand-built
//     board-state.json and asserts every story lands in exactly one column.
//     `awaiting_review` — the single status where a human is supposed to be
//     watching — used to land in zero.
console.log('\n[17] Kanban renders every fixture story into exactly one column');
{
  const kb = fs.readFileSync(path.join(ROOT, 'dashboard', 'kanban.html'), 'utf8');
  const columnsBlock = kb.match(/var COLUMNS = \[([\s\S]*?)\];/)?.[1] || '';
  const cols = [...columnsBlock.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
  const fixture = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.opencode', 'fixtures', 'board-state.valid.json'), 'utf8'));

  // Mirror of kanban.html's render() filter: `s.status === col.key`.
  let unplaced = 0;
  for (const story of fixture.stories) {
    const landed = cols.filter((k) => story.status === k);
    if (landed.length === 1) {
      ok(`fixture story ${story.id} (${story.status}) → column '${landed[0]}'`);
    } else {
      bad(`fixture story ${story.id} (${story.status}) lands in ${landed.length} columns — it would ${landed.length === 0 ? 'vanish from' : 'be duplicated on'} the board`);
      unplaced++;
    }
  }
  if (!fixture.stories.some((s) => s.status === 'awaiting_review')) {
    bad('.opencode/fixtures/board-state.valid.json: no awaiting_review story — the regression this fixture exists to catch is untested');
  } else if (unplaced === 0) {
    ok('fixture covers awaiting_review (the status that used to have no column)');
  }
}

// 18. INV-018 chokepoint (remediation Phase 2). Greps every AGENTS/*.md and
//     skills/*/SKILL.md for references to the host's raw dispatch primitive.
//     `anymake-dispatch/SKILL.md` is the seam itself and is exempt wholesale;
//     `AGENTS/orchestrator.md`'s Step 0 capability check legitimately names the
//     tool to test for its presence. Everywhere else, a mention is only allowed
//     when it is either (a) prohibitive ("do not call the Agent tool directly"),
//     or (b) inside a paragraph carrying the explicit research-delegation
//     exemption block, per AGENTS/arbiter.md §"INV-018 Scope".
//     This is what would have caught anymake-build-loop and
//     anymake-experience-check instructing the raw spawn.
console.log('\n[18] INV-018 dispatch chokepoint (no unlisted raw Agent/Task spawns)');
{
  // The arbiter must actually carry the scope decision the call sites cite.
  const arbiter = fs.readFileSync(path.join(AGENTS_DIR, 'arbiter.md'), 'utf8');
  if (arbiter.includes('INV-018 Scope') &&
      /read-only research delegation[\s\S]{0,200}exempt/i.test(arbiter)) {
    ok('AGENTS/arbiter.md: carries the durable INV-018 scope decision');
  } else {
    bad('AGENTS/arbiter.md: missing the INV-018 scope section (the exemption must be a recorded decision, not implicit per-file wording)');
  }

  const PRIMITIVE = /\bAgent\s*\(|\bAgent\/(?:sub)?[Aa]gent tool|\bAgent\/Task tool|`Agent`\s*(?:\/\s*`?Task`?\s*)?tool|\bAgent tool\b|\bTask tool\b|\bsubagent tool\b/;
  // Wording that makes the mention a prohibition rather than an instruction.
  const PROHIBITIVE = /\b(?:never|do not|don't|not|rather than|instead of)\b[^.\n]{0,80}(?:call|use|spawn|invoke)/i;
  const EXEMPT_MARKER = 'Exempt: research delegation (INV-018)';

  const targets = [
    ...fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md')).map((f) => ({ rel: path.join('AGENTS', f), abs: path.join(AGENTS_DIR, f) })),
    ...dirs.filter((d) => d !== 'anymake-dispatch')
      .map((d) => ({ rel: path.join('skills', d, 'SKILL.md'), abs: path.join(SKILLS_DIR, d, 'SKILL.md') })),
  ];

  let violations = 0;
  for (const { rel, abs } of targets) {
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!PRIMITIVE.test(line)) continue;
      // Allowed: the orchestrator's Step 0 capability check (it must name the
      // tool to test whether the host provides it at all).
      if (rel === 'AGENTS/orchestrator.md' && i < 25) continue;
      // Test the prohibition across the wrapped line too — "do not call" and
      // "the Agent tool directly" routinely land on separate markdown lines.
      const joined = (lines[i - 1] || '') + ' ' + line;
      if (PROHIBITIVE.test(joined)) continue;
      // Allowed: a mention describing what the dispatch skill wraps, or the
      // host's tool as a property of the environment rather than a call.
      if (/anymake-dispatch|the skill (?:uses|wraps)|backend dispatch primitive|host'?s (?:Agent\/Task |dispatch )?(?:tool|primitive)|Wraps the host/i.test(joined)) continue;
      // Allowed: inside an explicitly-marked research-delegation exemption.
      const window = lines.slice(Math.max(0, i - 6), i + 8).join('\n');
      if (window.includes(EXEMPT_MARKER)) continue;
      bad(`${rel}:${i + 1}: names the host's raw dispatch primitive without routing through anymake-dispatch or citing the research exemption → ${line.trim().slice(0, 110)}`);
      violations++;
    }
  }
  if (violations === 0) ok(`INV-018: no unlisted raw dispatch instructions across ${targets.length} instruction files`);

  // The two files the audit caught must now read like orchestrator.md does.
  for (const skill of ['anymake-build-loop', 'anymake-experience-check']) {
    const body = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
    if (body.includes('anymake-dispatch') && body.includes('INV-018')) {
      ok(`skills/${skill}/SKILL.md: routes dispatch through anymake-dispatch (INV-018)`);
    } else {
      bad(`skills/${skill}/SKILL.md: does not route its spawns through anymake-dispatch`);
    }
  }
  // The experience-check skill must carry a real DISPATCH request, matching
  // Phase 1's corrected case-insensitive VERDICT grep.
  const expCheck = fs.readFileSync(path.join(SKILLS_DIR, 'anymake-experience-check', 'SKILL.md'), 'utf8');
  if (/DISPATCH \{[\s\S]*?anymake-experience-runner[\s\S]*?output_check[\s\S]*?VERDICT:/.test(expCheck)) {
    ok('skills/anymake-experience-check/SKILL.md: DISPATCH request carries output_artifact + a VERDICT output_check');
  } else {
    bad('skills/anymake-experience-check/SKILL.md: missing a DISPATCH request with output_check');
  }
}

// 19. Absolute-claim drift (remediation Phase 3). Root AGENTS.md summarizes ten
//     detailed AGENTS/*.md specs. An absolute claim ("must never ...", "must
//     ...") that appears only in the summary is drift: it either contradicts
//     the spec or invents a rule the spec never states. Both are how
//     "Orchestrator must never run two stories concurrently" outlived the
//     concurrency model that replaced it.
//
//     Not NLP: each claim's distinctive content words must appear in the role's
//     own file or in the arbiter (which roles defer to). A claim below the
//     overlap threshold is reported for a human to reconcile — it is a prompt
//     to check, and the fix is to update whichever file is stale.
console.log('\n[19] Absolute-claim drift (AGENTS.md "must"/"never" rules trace to a spec)');
{
  const agentsMd = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  const arbiterBody = fs.readFileSync(path.join(AGENTS_DIR, 'arbiter.md'), 'utf8').toLowerCase();

  // AGENTS.md role heading -> the detailed file it summarizes.
  const ROLE_FILES = {
    'Orchestrator': 'orchestrator.md',
    'Planner': 'planner.md',
    'Worker': 'worker.md',
    'Validator': 'validator.md',
    'Experience Runner': 'experience-runner.md',
    'Product Owner Proxy': 'product-owner-proxy.md',
    'Cartographer': 'cartographer.md',
    'Solution Architect': 'solution-architect.md',
    'Plan Reviewer': 'plan-reviewer.md',
  };
  const STOP = new Set(['that','this','with','from','into','than','then','when','what','which','your','their','have','been','does','doing','make','made','only','also','even','just','same','such','they','them','there','here','over','under','without','before','after','because','while','about','never','always','must','not','the','and','for','its','it','a','an','of','to','in','on','is','are','be','or','by','as','at','one','two','all','any','own','per','via','see','use','used','using','something','anything','instead','rather','those','these','other','more','most','less','each','every','some','both','again','still','yet','way','thing','things','like','unless','into']);
  const contentWords = (text) => [...new Set(
    text.toLowerCase()
      .replace(/`[^`]*`/g, ' ')            // drop code spans (paths, symbols)
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
  )];

  const OVERLAP_MIN = 0.5;
  let checked = 0;
  let drifted = 0;

  for (const [role, file] of Object.entries(ROLE_FILES)) {
    const specPath = path.join(AGENTS_DIR, file);
    if (!fs.existsSync(specPath)) { bad(`AGENTS.md summarizes ${role}, but AGENTS/${file} does not exist`); continue; }
    const spec = fs.readFileSync(specPath, 'utf8').toLowerCase();

    // The "**<Role> must never:**" / "**<Role> must:**" bullet lists.
    const listRe = new RegExp(`\\*\\*${role} must(?: never)?:\\*\\*\\n((?:- .*\\n)+)`, 'g');
    for (const m of agentsMd.matchAll(listRe)) {
      for (const line of m[1].split('\n').filter((l) => l.startsWith('- '))) {
        const claim = line.slice(2).trim();
        const words = contentWords(claim);
        if (words.length < 3) continue;      // too short to judge
        checked++;
        const hits = words.filter((w) => spec.includes(w) || arbiterBody.includes(w));
        const overlap = hits.length / words.length;
        if (overlap < OVERLAP_MIN) {
          const missing = words.filter((w) => !hits.includes(w));
          bad(`AGENTS.md: "${role} must..." rule does not trace to AGENTS/${file} or arbiter.md (${Math.round(overlap * 100)}% of terms found; unmatched: ${missing.slice(0, 6).join(', ')}) → "${claim.slice(0, 95)}"`);
          drifted++;
        }
      }
    }
  }
  if (checked === 0) {
    bad('AGENTS.md: parsed no "must"/"must never" rules — the parser is broken or the rules were removed');
  } else if (drifted === 0) {
    ok(`AGENTS.md: all ${checked} absolute role rules trace back to their detailed spec or the arbiter`);
  }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
