// Verification harness: exercises the Anymake plugin's hooks the way OpenCode
// would, and validates that every skill is discoverable with valid frontmatter.
// Run: node .opencode/verify-plugin.mjs   (delete after — not part of the plugin)
import fs from 'fs';
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
delete process.env.ANYMAKE_MODEL_TIER1;
delete process.env.ANYMAKE_MODEL_TIER2;
delete process.env.ANYMAKE_MODEL_TIER3;

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
