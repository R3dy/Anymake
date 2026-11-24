# Installing Anymake for OpenCode

Anymake is an OpenCode plugin. It targets **OpenCode 2.4.1 and newer** (the V2
plugin API) and still loads on OpenCode 1.18.29+ through its V1 fallback.

## The fastest way: tell your agent

Paste this into OpenCode (or any coding agent with a shell):

> Install the Anymake OpenCode plugin by following
> https://raw.githubusercontent.com/R3dy/Anymake/main/.opencode/INSTALL.md

The agent runs the steps in the next section and tells you when to restart.

## If you are an AI agent following these instructions

Do these in order. Stop and tell the user what failed if a step errors.

1. **Check the OpenCode version.**
   ```bash
   opencode --version
   ```
   - `2.4.1` or newer → continue with step 2.
   - `1.x` → skip to [OpenCode 1.x](#opencode-1x-legacy) below, then go to step 4.
   - Command not found → tell the user OpenCode is not installed (https://opencode.ai) and stop.

2. **Install the plugin** (global, every project gets it):
   ```bash
   opencode plugin add github:R3dy/Anymake
   ```
   If that command is unavailable or fails (no network to GitHub through the
   CLI, an older 2.x build), use the clone fallback instead — OpenCode
   auto-discovers any plugin directory in `~/.config/opencode/plugins/`:
   ```bash
   git clone https://github.com/R3dy/Anymake.git ~/.config/opencode/plugins/anymake
   ```
   Use only one of the two methods — both together load the plugin twice.

3. **Check it resolved.**
   ```bash
   opencode plugin check
   ```
   It should report no errors for `anymake`. (`opencode plugin list` shows
   plugins installed with `plugin add`; a cloned plugin directory is not
   listed there, and that is fine.)

4. **Tell the user:** "Anymake is installed. Restart OpenCode, then say
   *@anymake Start a new project* to begin." If OpenCode runs as a background service,
   `opencode service restart` restarts it.

Do **not** edit `opencode.json` for a normal install — steps 2–3 are the whole
install. Do not add Anymake's agents to the user's config by hand; the plugin
manages them (see [What the plugin sets up](#what-the-plugin-sets-up)).

## Verify

After restarting OpenCode:

- Ask `"@anymake Start a new project"` — the assistant should answer in Anymake mode.
- Don't expect Anymake in an answer to `"What skills do you have?"` — its skills
  are deliberately hidden from the model until invoked (see Usage).
- `ls ~/.config/opencode/agents/anymake-*.md` should list 8 agent files.

## Usage

Anymake's skills load **only when you invoke them** — nothing is added to the
model's context until you do. Start every Anymake conversation by mentioning
the skill as `@anymake`; it loads its companion skills (`anymake-dispatch`,
`anymake-build-loop`, …) itself as it needs them.

| Say this | What happens |
|----------|-------------|
| `"@anymake Start a new project"` | Creates a new project workspace, begins Phase 0 Foundation |
| `"@anymake Continue [project name]"` | Reads PHASE_STATE.md, resumes the last step |
| `"@anymake I have a product idea: [description]"` | Starts Phase 0 from your idea |

Every Anymake skill sets `metadata.opencode/autoinvoke: false`, which keeps it
out of the model's skill list (no name or description in every request) while
leaving it loadable by id. Set the plugin option `"bootstrap": true` if you'd
rather have Anymake always on without `@anymake`.

## What the plugin sets up

On every OpenCode start the plugin:

- **Registers the skills** — every `skills/<id>/SKILL.md` becomes an on-demand
  OpenCode skill (`autoinvoke: false`): loaded by `@anymake`, or by id from an
  already-loaded Anymake skill. Each one is told where the plugin is installed,
  so it can find `AGENTS/`, `TEMPLATES/` and the other supporting files.
- **Adds nothing to your prompts by default.** With `"bootstrap": true` it puts
  the hub skill into every primary-agent system prompt instead; Anymake's own
  subagents always keep their own prompts.
- **Registers the spawned agents** (Planner, Worker, Validator, Experience
  Runner, Product Owner Proxy, Cartographer, Solution Architect, Plan
  Reviewer) as named subagents. OpenCode V2 plugins cannot create agents
  directly, so the plugin writes them as `~/.config/opencode/agents/anymake-*.md`
  (honoring `XDG_CONFIG_HOME`). Each file starts with an
  `<!-- anymake:generated -->` marker; the plugin only ever rewrites or deletes
  files carrying that marker, so a hand-written `anymake-*.md` of your own is
  left alone. Edit `AGENTS/*.md` in the plugin, not the generated copies.

## Model Tiers (optional)

By default every spawned agent runs on the model your primary OpenCode session
uses. To split cost/quality across three tiers — a frontier model for judgment
calls, a capable model for translation and review, your fastest model for the
high-volume Worker — pick any one of these:

**Option A — three environment variables** (whole tier at once, no JSON):
```bash
export ANYMAKE_MODEL_TIER1="anthropic/claude-opus-5"      # frontier
export ANYMAKE_MODEL_TIER2="anthropic/claude-sonnet-5"    # capable
export ANYMAKE_MODEL_TIER3="anthropic/claude-haiku-4-5"   # economy
```
Set them before launching OpenCode. `provider/model#variant` is accepted.

**Option B — per agent, in your own `opencode.json`** (V2 key is `agents`):
```json
{
  "agents": {
    "anymake-worker": { "model": "anthropic/claude-haiku-4-5" },
    "anymake-validator": { "model": "anthropic/claude-sonnet-5" }
  }
}
```
Only `model` needs to be set — the description, mode and prompt still come
from the plugin. A model set here always wins over the tier.

**Option C — plugin options** (only when you list the plugin in
`opencode.json` yourself, e.g. a clone at an absolute path; don't also keep it
in `~/.config/opencode/plugins/`):
```json
{
  "plugins": [
    {
      "package": "/home/me/src/Anymake",
      "options": {
        "modelTiers": { "tier1": "anthropic/claude-opus-5", "tier2": "anthropic/claude-sonnet-5", "tier3": "anthropic/claude-haiku-4-5" }
      }
    }
  ]
}
```
Plugin options win over the environment variables.

### Plugin options

All optional, set in the `options` object shown above:

| Option | Default | Effect |
|--------|---------|--------|
| `modelTiers` | unset | `{ "tier1", "tier2", "tier3" }` model per tier (see above) |
| `bootstrap` | `false` | `true` = always on: the hub skill is put into every primary-agent request, so `@anymake` isn't needed. The environment variable `ANYMAKE_BOOTSTRAP=1` does the same without editing config (and is the only switch on OpenCode 1.x) |
| `syncAgents` | `true` | `false` = don't write agent files |
| `agentsDir` | `~/.config/opencode/agents` | write the agent files somewhere else |

Each agent's tier is fixed in its own file (`AGENTS/*.md` frontmatter,
`tier: 1|2|3`) — see `AGENTS/arbiter.md` → **Model Tier Policy** for which
agent lands on which tier and why. Configure nothing and everything falls back
to the primary session's model.

## Updating

```bash
opencode plugin update anymake
```
Then restart OpenCode. For a cloned install: `git -C ~/.config/opencode/plugins/anymake pull`.

To pin a version, install a tag or commit instead of the default branch:
```bash
opencode plugin add 'github:R3dy/Anymake#<tag-or-sha>'
```

## Uninstalling

```bash
opencode plugin remove anymake
rm -f ~/.config/opencode/agents/anymake-*.md
```
(For a cloned install, delete `~/.config/opencode/plugins/anymake` instead of
running `plugin remove`.)

## OpenCode 1.x (legacy)

OpenCode 1.x does not have `opencode plugin add`. Add Anymake to the V1
`plugin` array in `~/.config/opencode/opencode.json` (create the file if
missing, append if the array exists):

```jsonc
{
  "plugin": ["anymake@git+https://github.com/R3dy/Anymake.git"]
}
```

On 1.x the plugin uses its V1 fallback (requires 1.18.29+): skills and agents
are registered through the V1 `config` hook (the hub skill is not injected
into prompts unless `ANYMAKE_BOOTSTRAP=1`), and per-agent overrides use the V1
`agent` key instead of `agents`. Upgrading to 2.4.1+ is recommended — after
upgrading, remove that `plugin` entry and install with step 2 above.

## Troubleshooting

**Plugin not loading:**
```bash
opencode plugin check
opencode run --print-logs "hello" 2>&1 | grep -i anymake
```

**Anymake not responding:** start the message with `@anymake` — plain trigger
phrases like "Start a new project" no longer load it on their own. If
`@anymake` does nothing, confirm you restarted OpenCode after installing and
that `opencode plugin check` is clean.

**`[anymake] left anymake-<name>.md alone` in the logs:** a file with that
name already exists in your agents directory and was not written by Anymake.
Rename or delete it, then restart, if you want Anymake's version.

**Windows:** if `opencode plugin add github:…` fails, use the clone fallback
into `%USERPROFILE%\.config\opencode\plugins\anymake`.

## Getting Help

Report issues: https://github.com/R3dy/Anymake/issues
