/**
 * BMad Builder plugin for OpenCode.ai
 *
 * Registers the skills/ directory with OpenCode so the bmad-builder skill
 * is natively discovered. Also auto-injects the skill at session start so
 * the AI has full context without a manual /skill load.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Two levels up from .opencode/plugins/ → repo root
const PLUGIN_ROOT = path.resolve(__dirname, '../..');

const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');

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

// Cache bootstrap content after first read — no repeated FS work per turn
let _bootstrapCache = undefined;

export const BmadBuilderPlugin = async ({ client, directory }) => {

  const getBootstrapContent = () => {
    if (_bootstrapCache !== undefined) return _bootstrapCache;

    const skillPath = path.join(SKILLS_DIR, 'bmad-builder', 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      _bootstrapCache = null;
      return null;
    }

    const fullContent = fs.readFileSync(skillPath, 'utf8');
    const { content } = extractAndStripFrontmatter(fullContent);

    _bootstrapCache = `<EXTREMELY_IMPORTANT>
You have the BMad Builder skill loaded. Follow it for any product-building work.

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
