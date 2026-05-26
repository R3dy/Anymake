# Installing BMad Builder for OpenCode

## Prerequisites

- [OpenCode.ai](https://opencode.ai) installed

## Installation

Add bmad-builder to the `plugin` array in your `opencode.json`. This file lives at
`~/.config/opencode/opencode.json` for a global install, or in your project root for
a project-scoped install.

```json
{
  "plugin": ["bmad-builder@git+https://github.com/R3dy/BMAD-builder.git"]
}
```

Restart OpenCode. The plugin installs automatically and the BMad Builder skill becomes
active in every session — no manual loading required.

Verify by asking: `"Start a new project"` — Claude should respond in BMad Builder mode.

## If you are an AI agent following these instructions

1. Find the user's `opencode.json`. Check these locations in order:
   - `~/.config/opencode/opencode.json` (global)
   - `./opencode.json` (project root)
   - Create `~/.config/opencode/opencode.json` if neither exists

2. Add the plugin entry. If a `plugin` array already exists, append to it.
   If not, create it. The result should look like:
   ```json
   {
     "plugin": ["bmad-builder@git+https://github.com/R3dy/BMAD-builder.git"]
   }
   ```

3. Tell the user: "BMad Builder is installed. Restart OpenCode, then say 'Start a new
   project' to begin."

## Usage

BMad Builder loads automatically at the start of every session. Trigger it with:

| Say this | What happens |
|----------|-------------|
| `"Start a new project"` | Creates a new project workspace, begins Phase 0 Foundation |
| `"Continue [project name]"` | Reads PHASE_STATE.md, resumes the last step |
| `"I have a product idea: [description]"` | Triggers BMad Builder, starts Phase 0 |
| `"Build an app"` | Triggers BMad Builder |

## Updating

OpenCode pins git dependencies in its cache, so a restart may not pick up the latest
version. If updates don't appear, clear OpenCode's package cache or reinstall the plugin.

To pin a specific version:

```json
{
  "plugin": ["bmad-builder@git+https://github.com/R3dy/BMAD-builder.git#v1.0.0"]
}
```

## Troubleshooting

**Plugin not loading:**
```bash
opencode run --print-logs "hello" 2>&1 | grep -i bmad
```

**BMad Builder not responding to triggers:**
Ask: `"What skills do you have?"` — BMad Builder should appear in the list.

**Windows install issues:**
Some Windows builds have issues with git-backed plugin specs. Install via npm instead:
```powershell
npm install bmad-builder@git+https://github.com/R3dy/BMAD-builder.git --prefix "$HOME\.config\opencode"
```
Then point opencode.json at the local path:
```json
{
  "plugin": ["~/.config/opencode/node_modules/bmad-builder"]
}
```

## Getting Help

Report issues: https://github.com/R3dy/BMAD-builder/issues
