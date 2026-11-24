/**
 * Anymake plugin for OpenCode (V2 — verified against the @opencode/plugin 2.4.1
 * type definitions; also loads on OpenCode V1 ≥ 1.18.29 via `server()`).
 *
 * What it does, in V2 terms:
 *   1. Skills — registers every skills/<id>/SKILL.md with `ctx.skill.transform`
 *      (V2 has no mutable `config.skills.paths`). Every skill is on-demand: its
 *      `metadata.opencode/autoinvoke: false` frontmatter is carried into the
 *      registration, so nothing sits in the model's skill list or context until
 *      the user invokes it (`@anymake`) or a loaded skill loads a companion by
 *      id. Each registered body is prefixed with where the supporting files are
 *      installed, so an invoked skill can resolve AGENTS/, TEMPLATES/ etc.
 *   2. Agents — every AGENTS/*.md with `mode: subagent` becomes a named
 *      OpenCode subagent. V2's AgentEditor can update/remove agents but cannot
 *      ADD one, and agents only come from markdown files or the user's
 *      `agents` config. So the plugin keeps generated, marker-tagged copies in
 *      the global agents directory (~/.config/opencode/agents/anymake-*.md),
 *      rewriting them only when they change and never touching a file it did
 *      not write. Opt out with the plugin option `"syncAgents": false`.
 *   3. Model tiers — each agent's `tier: 1|2|3` (AGENTS/*.md frontmatter) is
 *      bound to a model through `ctx.agent.transform`, from the plugin options
 *      (`modelTiers`) or ANYMAKE_MODEL_TIER1/2/3. A model the user set for that
 *      agent in their own `agents` config always wins. See AGENTS/arbiter.md →
 *      "Model Tier Policy".
 *   4. Bootstrap (opt-in: plugin option `"bootstrap": true` or ANYMAKE_BOOTSTRAP=1) — pushes the hub
 *      skill into every primary-agent system prompt with
 *      `ctx.session.hook("context")`, so Anymake is always on without `@anymake`.
 *      Off by default: it costs the whole hub skill in every request.
 *
 * Zero dependencies on purpose (ADR-008): `Plugin.define` from
 * `@opencode/plugin` is an identity function (`define(plugin) { return plugin }`),
 * so the default export below is the exact object it would return.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Two levels up from .opencode/plugins/ → repo root
const PLUGIN_ROOT = path.resolve(__dirname, '../..');

const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');
const AGENTS_DIR = path.join(PLUGIN_ROOT, 'AGENTS');

const PLUGIN_ID = 'anymake';
const BOOTSTRAP_MARKER = 'EXTREMELY_IMPORTANT';
// First line of every agent file this plugin generates. Ownership test: a file
// without it was written by someone else and is never overwritten or deleted.
const GENERATED_MARKER = '<!-- anymake:generated';

// Tier N is whatever model the user configures for it. Unset → the subagent
// falls back to OpenCode's default (the primary session's model) — nothing
// breaks if a user never configures tiers.
const MODEL_TIER_ENV_VAR = {
  1: 'ANYMAKE_MODEL_TIER1',
  2: 'ANYMAKE_MODEL_TIER2',
  3: 'ANYMAKE_MODEL_TIER3',
};

const extractAndStripFrontmatter = (content) => {
  const match = content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }
  return { frontmatter, content: match[2] };
};

// ── Skills ────────────────────────────────────────────────────────────────

// Prefixed to every registered skill body. Skills load on demand, so this —
// not an always-on bootstrap — is what tells an invoked skill where its
// supporting files live, and how to reach a companion skill if the host
// refuses to load a hidden (autoinvoke: false) skill by id.
const skillLocatorNote = () => `> **Anymake is installed at \`${PLUGIN_ROOT}\`.** Resolve every \`AGENTS/\`,
> \`TEMPLATES/\`, \`PHASE_GUIDES/\`, \`PROJECT_TYPES/\`, \`dashboard/\` and \`skills/\` path
> against that directory. To use a companion skill (\`anymake-*\`), load it by id with
> the \`skill\` tool; if that is refused, read \`${SKILLS_DIR}/<id>/SKILL.md\` directly.`;

const buildSkillEntries = () => {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const skills = [];
  for (const dirent of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const skillPath = path.join(SKILLS_DIR, dirent.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const { frontmatter, content } = extractAndStripFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    // Mirror V2's own frontmatter rules: `opencode/autoinvoke` wins over
    // `disable-model-invocation` when both are set.
    const autoinvokeRaw = frontmatter['opencode/autoinvoke'];
    const autoinvoke = autoinvokeRaw !== undefined
      ? autoinvokeRaw !== 'false'
      : frontmatter['disable-model-invocation'] !== 'true';
    // V2 derives a skill's ID from its directory name — mirror that exactly.
    skills.push({
      id: dirent.name,
      name: frontmatter.name || dirent.name,
      description: frontmatter.description || undefined,
      autoinvoke,
      path: skillPath,
      content: `${skillLocatorNote()}\n\n${content.trim()}`,
    });
  }
  return skills;
};

// ── Agents ────────────────────────────────────────────────────────────────

// Deliberately not cached: reads a handful of small files once per setup and
// must re-read tier configuration each time.
const buildAgentDefinitions = () => {
  const agents = [];
  if (!fs.existsSync(AGENTS_DIR)) return agents;
  for (const file of fs.readdirSync(AGENTS_DIR).sort()) {
    if (!file.endsWith('.md')) continue;
    const { frontmatter, content } = extractAndStripFrontmatter(
      fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8'));
    // arbiter.md / orchestrator.md have no frontmatter — read, never spawned.
    if (frontmatter.mode !== 'subagent' || !frontmatter.name) continue;
    agents.push({
      name: frontmatter.name,
      source: file,
      description: frontmatter.description || '',
      tier: frontmatter.tier,
      prompt: content.trim(),
    });
  }
  return agents;
};

// V2 markdown agent: frontmatter carries the agent config fields, the body is
// its `system` prompt. `model` is intentionally absent — tiers bind at runtime
// (see bindTierModels) so changing a tier never requires rewriting files.
const renderAgentFile = (agent) => `---
description: ${JSON.stringify(agent.description)}
mode: subagent
---
${GENERATED_MARKER} from AGENTS/${agent.source} by the Anymake OpenCode plugin. Edits are overwritten on the next load; change the source file instead. -->

Anymake supporting files are installed at \`${PLUGIN_ROOT}\`. Resolve every
\`AGENTS/\`, \`TEMPLATES/\`, \`PHASE_GUIDES/\`, \`PROJECT_TYPES/\` and \`skills/\`
path below against that directory.

${agent.prompt}
`;

const defaultAgentsDir = () => {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'opencode', 'agents');
};

const isGenerated = (file) => {
  try { return fs.readFileSync(file, 'utf8').includes(GENERATED_MARKER); } catch { return false; }
};

/** Writes/refreshes the generated agent files. Returns what changed. */
const syncAgentFiles = (agentsDir, agents) => {
  const result = { written: [], unchanged: [], removed: [], skipped: [] };
  fs.mkdirSync(agentsDir, { recursive: true });
  const wanted = new Set();
  for (const agent of agents) {
    const file = path.join(agentsDir, `${agent.name}.md`);
    wanted.add(file);
    const body = renderAgentFile(agent);
    if (fs.existsSync(file)) {
      if (!isGenerated(file)) { result.skipped.push(agent.name); continue; } // user-owned
      if (fs.readFileSync(file, 'utf8') === body) { result.unchanged.push(agent.name); continue; }
    }
    fs.writeFileSync(file, body);
    result.written.push(agent.name);
  }
  // Remove generated files for agents that no longer exist in AGENTS/.
  for (const f of fs.readdirSync(agentsDir)) {
    const file = path.join(agentsDir, f);
    if (f.startsWith('anymake-') && f.endsWith('.md') && !wanted.has(file) && isGenerated(file)) {
      fs.rmSync(file);
      result.removed.push(f.replace(/\.md$/, ''));
    }
  }
  return result;
};

// "provider/model#variant" → V2 Model.Ref { providerID, id, variant? }.
// Only the first "/" splits provider from model (openrouter ids contain more).
const parseModelRef = (spec) => {
  if (typeof spec !== 'string') return undefined;
  const [ref, variant] = spec.trim().split('#');
  const slash = ref.indexOf('/');
  if (slash <= 0 || slash === ref.length - 1) return undefined;
  const model = { providerID: ref.slice(0, slash), id: ref.slice(slash + 1) };
  if (variant) model.variant = variant;
  return model;
};

// Plugin options win over env vars. Accepts { modelTiers: { 1|tier1: "p/m" } }.
const resolveTierModels = (options = {}) => {
  const fromOptions = options.modelTiers || {};
  const tiers = {};
  for (const tier of [1, 2, 3]) {
    const spec = fromOptions[tier] ?? fromOptions[`tier${tier}`] ?? process.env[MODEL_TIER_ENV_VAR[tier]];
    const model = parseModelRef(spec);
    if (model) tiers[tier] = model;
  }
  return tiers;
};

// ── Bootstrap ─────────────────────────────────────────────────────────────

let _bootstrapCache;
const getBootstrapContent = () => {
  if (_bootstrapCache !== undefined) return _bootstrapCache;
  const skillPath = path.join(SKILLS_DIR, 'anymake', 'SKILL.md');
  if (!fs.existsSync(skillPath)) return (_bootstrapCache = null);
  const { content } = extractAndStripFrontmatter(fs.readFileSync(skillPath, 'utf8'));
  _bootstrapCache = `<${BOOTSTRAP_MARKER}>
You have the Anymake skill loaded. Follow it for any product-building work.

${content}

**Supporting files are installed at:** \`${PLUGIN_ROOT}\`

When the skill references files like \`PHASE_GUIDES/phase-0.md\`, \`AGENTS/orchestrator.md\`,
or \`TEMPLATES/prd.md\`, read them from their full path:
  ${PLUGIN_ROOT}/PHASE_GUIDES/
  ${PLUGIN_ROOT}/AGENTS/
  ${PLUGIN_ROOT}/TEMPLATES/

**Tool mapping for OpenCode:**
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → your native read, edit and shell tools
- \`Skill\` → OpenCode's native \`skill\` tool (load a companion skill by its id, e.g. \`anymake-dispatch\`)
- \`Task\` / \`Agent\` sub-agent spawns → OpenCode's subagent launcher, naming the registered agent (e.g. \`anymake-worker\`); always via the \`anymake-dispatch\` skill

</${BOOTSTRAP_MARKER}>`;
  return _bootstrapCache;
};

// Always-on injection of the whole hub skill is opt-in: plugin option
// `bootstrap: true` (V2) or ANYMAKE_BOOTSTRAP=1 (V2 and the V1 fallback, which
// has no plugin options). Off by default — it costs the full hub skill in
// every request; `@anymake` loads it only when wanted.
const bootstrapEnabled = (options = {}) => options.bootstrap === true || process.env.ANYMAKE_BOOTSTRAP === '1';

const isAnymakeSubagent = (agentID) => typeof agentID === 'string' && agentID.startsWith('anymake-');

// ── V2 setup ──────────────────────────────────────────────────────────────

const setup = async (ctx) => {
  const options = ctx.options || {};
  const registrations = [];
  const warn = (msg, err) => console.warn(`[anymake] ${msg}${err ? `: ${err.message || err}` : ''}`);
  // One failing domain must not take the others down.
  const step = async (label, fn) => { try { await fn(); } catch (err) { warn(label, err); } };

  const agents = buildAgentDefinitions();

  await step('skill registration failed', async () => {
    const skills = buildSkillEntries();
    registrations.push(await ctx.skill.transform((editor) => {
      for (const skill of skills) {
        if (!editor.get(skill.id)) editor.add(skill);
      }
    }));
  });

  if (options.syncAgents !== false) {
    await step('agent file sync failed', async () => {
      const result = syncAgentFiles(options.agentsDir || defaultAgentsDir(), agents);
      for (const name of result.skipped) {
        warn(`left ${name}.md alone — it exists but was not generated by Anymake`);
      }
      if ((result.written.length || result.removed.length) && ctx.agent.reload) await ctx.agent.reload();
    });
  }

  await step('model-tier binding failed', async () => {
    const tiers = resolveTierModels(options);
    if (!Object.keys(tiers).length) return; // nothing configured → host default
    registrations.push(await ctx.agent.transform((editor) => {
      for (const agent of agents) {
        const model = tiers[agent.tier];
        const current = editor.get(agent.name);
        // A model from the user's own `agents` config wins.
        if (model && current && !current.model) editor.update(agent.name, (a) => { a.model = { ...model }; });
      }
    }));
  });

  if (bootstrapEnabled(options)) await step('bootstrap hook failed', async () => {
    registrations.push(await ctx.session.hook('context', (event) => {
      if (isAnymakeSubagent(event.agent)) return; // subagents get their own prompt
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !Array.isArray(event.system)) return;
      if (event.system.some((p) => typeof p?.text === 'string' && p.text.includes(BOOTSTRAP_MARKER))) return;
      event.system.push({ type: 'text', text: bootstrap });
    }));
  });

  return async () => {
    await Promise.all(registrations.map((r) => r?.dispose?.().catch(() => {})));
  };
};

// ── V1 fallback (OpenCode 1.18.29+ loads `server`; ignored by V2) ─────────

const server = async () => ({
  config: async (config) => {
    config.skills = config.skills || {};
    config.skills.paths = config.skills.paths || [];
    if (!config.skills.paths.includes(SKILLS_DIR)) config.skills.paths.push(SKILLS_DIR);

    const tiers = resolveTierModels();
    config.agent = config.agent || {};
    for (const agent of buildAgentDefinitions()) {
      const def = { description: agent.description, mode: 'subagent', prompt: agent.prompt };
      const t = tiers[agent.tier];
      if (t) def.model = `${t.providerID}/${t.id}`;
      // Field-level merge: the user's opencode.json wins per field.
      config.agent[agent.name] = { ...def, ...(config.agent[agent.name] || {}) };
    }
  },
  'experimental.chat.messages.transform': async (_input, output) => {
    if (!bootstrapEnabled()) return;
    const bootstrap = getBootstrapContent();
    if (!bootstrap || !output.messages.length) return;
    const firstUser = output.messages.find((m) => m.info.role === 'user');
    if (!firstUser || !firstUser.parts.length) return;
    if (firstUser.parts.some((p) => p.type === 'text' && p.text.includes(BOOTSTRAP_MARKER))) return;
    firstUser.parts.unshift({ ...firstUser.parts[0], type: 'text', text: bootstrap });
  },
});

export default { id: PLUGIN_ID, setup, server };
