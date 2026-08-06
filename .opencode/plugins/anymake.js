/**
 * Anymake plugin for OpenCode.ai
 *
 * Registers the skills/ directory with OpenCode so the anymake skill
 * is natively discovered. Also auto-injects the skill at session start so
 * the AI has full context without a manual /skill load, and registers each
 * spawned agent in AGENTS/ as a named OpenCode subagent bound to a model
 * tier — see "Model Tier Policy" in AGENTS/arbiter.md.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Two levels up from .opencode/plugins/ → repo root
const PLUGIN_ROOT = path.resolve(__dirname, '../..');

const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');
const AGENTS_DIR = path.join(PLUGIN_ROOT, 'AGENTS');

// Tier N is whatever model the user sets in this env var. Unset → the
// registered subagent falls back to OpenCode's default (the primary
// session's model) — nothing breaks if a user never configures tiers.
const MODEL_TIER_ENV_VAR = {
  1: 'ANYMAKE_MODEL_TIER1',
  2: 'ANYMAKE_MODEL_TIER2',
  3: 'ANYMAKE_MODEL_TIER3',
};

const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };
  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};
  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }
  return { frontmatter, content: body };
};

// Every AGENTS/*.md file with `mode: subagent` in its frontmatter becomes a
// named OpenCode agent. The file's own `tier` field (1/2/3) — set once, in
// the agent file itself — picks which ANYMAKE_MODEL_TIER<N> env var supplies
// its model. arbiter.md has no frontmatter (it's read, never spawned) and is
// skipped automatically. Deliberately NOT cached, unlike bootstrap content
// below: this reads a handful of small files once at config time, and must
// re-read process.env each time — caching it risks pinning a stale (or
// missing) tier model if config() ever runs more than once in a process.
const buildAgentRegistrations = () => {
  const agents = {};
  if (!fs.existsSync(AGENTS_DIR)) return agents;

  for (const file of fs.readdirSync(AGENTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const fullContent = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const { frontmatter, content } = extractAndStripFrontmatter(fullContent);
    if (frontmatter.mode !== 'subagent' || !frontmatter.name) continue;

    const entry = {
      description: frontmatter.description || '',
      mode: 'subagent',
      prompt: content.trim(),
    };

    const envVar = MODEL_TIER_ENV_VAR[frontmatter.tier];
    const tierModel = envVar && process.env[envVar];
    if (tierModel) entry.model = tierModel;

    agents[frontmatter.name] = entry;
  }

  return agents;
};

// Cache bootstrap content after first read — no repeated FS work per turn
let _bootstrapCache = undefined;

export const AnymakePlugin = async ({ client, directory }) => {

  const getBootstrapContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache;

    const skillPath = path.join(SKILLS_DIR, 'anymake', 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      _bootstrapCache = null;
      return null;
    }

    const fullContent = fs.readFileSync(skillPath, 'utf8');
    const { content } = extractAndStripFrontmatter(fullContent);

    _bootstrapCache = `<EXTREMELY_IMPORTANT>
You have the Anymake skill loaded. Follow it for any product-building work.

${content}

**Supporting files are installed at:** \`${PLUGIN_ROOT}\`

When the skill references files like \`PHASE_GUIDES/phase-0.md\`, \`AGENTS/orchestrator.md\`,
or \`TEMPLATES/prd.md\`, read them from their full path:
  ${PLUGIN_ROOT}/PHASE_GUIDES/
  ${PLUGIN_ROOT}/AGENTS/
  ${PLUGIN_ROOT}/TEMPLATES/

**Tool mapping for OpenCode:**
- \`Read\`, \`Write\`, \`Edit\`, \`Bash\` → your native file and shell tools
- \`Skill\` tool → OpenCode's native \`skill\` tool
- \`Task\` with subagents → OpenCode's subagent / @mention system
- \`Agent\` tool → spawn a subagent in OpenCode

</EXTREMELY_IMPORTANT>`;

    return _bootstrapCache;
  };

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(SKILLS_DIR)) {
        config.skills.paths.push(SKILLS_DIR);
      }

      config.agent = config.agent || {};
      for (const [name, def] of Object.entries(buildAgentRegistrations())) {
        // Never clobber an agent the user already defined themselves.
        if (!config.agent[name]) config.agent[name] = def;
      }
    },
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;

      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;

      // Guard against double-injection
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;

      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
    }
  };
};
