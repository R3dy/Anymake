# Installing Anymake for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add anymake to the `plugin` array in your `opencode.json`. This file lives at
`~/.config/opencode/opencode.json` for a global install, or in your project root for
a project-scoped install.

```json
{
  "plugin": ["anymake@git+https://github.com/R3dy/Anymake.git"]
}
```

Restart OpenCode. The plugin installs automatically and the Anymake skill becomes
active in every session — no manual loading required.

Verify by asking: `"Start a new project"` — Claude should respond in Anymake mode.

## If you are an AI agent following these instructions

1. Find the user's `opencode.json`. Check these locations in order:
   - `~/.config/opencode/opencode.json` (global)
   - `./opencode.json` (project root)
   - Create `~/.config/opencode/opencode.json` if neither exists

2. Add the plugin entry. If a `plugin` array already exists, append to it.
   If not, create it. The result should look like:
   ```json
   {
     "plugin": ["anymake@git+https://github.com/R3dy/Anymake.git"]
   }
   ```

3. Tell the user: "Anymake is installed. Restart OpenCode, then say 'Start a new
   project' to begin."

## Usage

Anymake loads automatically at the start of every session. Trigger it with:

| Say this | What happens |
|----------|-------------|
| `"Start a new project"` | Creates a new project workspace, begins Phase 0 Foundation |
| `"Continue [project name]"` | Reads PHASE_STATE.md, resumes the last step |
| `"I have a product idea: [description]"` | Triggers Anymake, starts Phase 0 |
| `"Build an app"` | Triggers Anymake |

## Model Tiers (optional)

By default every spawned agent (Planner, Worker, Validator, Product Owner Proxy,
Cartographer, Solution Architect, Plan Reviewer) runs on whatever model your
primary OpenCode session uses. To split cost/quality across three tiers instead
— a frontier model for judgment calls, a cheaper capable model for translation
and review, and your fastest model for high-volume Worker execution — pick one:

**Option A — your own `opencode.json`, per agent** (schema-safe, no shell setup):
```json
{
  "agent": {
    "anymake-worker": { "model": "anthropic/claude-haiku-4-5" },
    "anymake-planner": { "model": "anthropic/claude-sonnet-5" },
    "anymake-validator": { "model": "anthropic/claude-sonnet-5" },
    "anymake-product-owner-proxy": { "model": "anthropic/claude-opus-5" }
  }
}
```
Only the field you set is overridden — the plugin still fills in `mode`/`prompt`/`description`.

**Option B — three environment variables** (applies to a whole tier at once, no JSON editing):
```bash
export ANYMAKE_MODEL_TIER1="anthropic/claude-opus-5"     # frontier
export ANYMAKE_MODEL_TIER2="anthropic/claude-sonnet-5"    # capable
export ANYMAKE_MODEL_TIER3="anthropic/claude-haiku-4-5"  # economy
```
Set before launching OpenCode. An `opencode.json` override (Option A) always wins over the matching env var for that agent.

Each agent's tier is fixed in its own file (`AGENTS/*.md` frontmatter, `tier: 1|2|3`)
— see `AGENTS/arbiter.md` → **Model Tier Policy** for the full table, which agent
lands on which tier, and why a bare custom config key (e.g. `"anymake": {...}`)
isn't used — OpenCode's config schema is strict enough that an unrecognized key
can throw `ConfigInvalidError`. Configure neither option and everything falls
back to the primary session's model — nothing breaks if you skip this section.

## Updating

OpenCode pins git dependencies in its cache, so a restart may not pick up the latest
version. If updates don't appear, clear OpenCode's package cache or reinstall the plugin.

To pin a specific version:

```json
{
  "plugin": ["anymake@git+https://github.com/R3dy/Anymake.git#v1.0.0"]
}
```

## Troubleshooting

**Plugin not loading:**
```bash
opencode run --print-logs "hello" 2>&1 | grep -i anymake
```

**Anymake not responding to triggers:**
Ask: `"What skills do you have?"` — Anymake should appear in the list.

**Windows install issues:**
Some Windows builds have issues with git-backed plugin specs. Install via npm instead:
```powershell
npm install anymake@git+https://github.com/R3dy/Anymake.git --prefix "$HOME\.config\opencode"
```
Then point opencode.json at the local path:
```json
{
  "plugin": ["~/.config/opencode/node_modules/anymake"]
}
```

## Getting Help

Report issues: https://github.com/R3dy/Anymake/issues
