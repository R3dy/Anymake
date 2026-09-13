// Arena construction — §3.2.
//
// An arena is the entire world one cell can see. Three isolation rules, each here
// because its absence would silently corrupt a score:
//   1. HOME and PATH are overridden per cell, or one cell's session store, gh auth
//      or npm cache leaks into another's telemetry.
//   2. The oracle is never inside the arena. It lives under evals/fixtures/<id>/oracle/
//      and runs against the final tree from outside — a run cannot satisfy what it
//      cannot see.
//   3. No network dependence in the critical path. Fixtures vendor their deps; LLM
//      API traffic is the one permitted egress.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { ensureDir, writeJSON, writeText, exists, log, REPO_ROOT, HARNESS_ROOT } from '../lib/util.mjs';

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

export function buildArena({ cellDir, sha, scenario, fixture, modelConfig, ablation, projectName }) {
  const arena = ensureDir(path.join(cellDir, 'arena'));
  const dirs = {
    anymake: ensureDir(path.join(arena, 'anymake')),
    missionControl: ensureDir(path.join(arena, 'mission-control', 'PROJECTS')),
    home: ensureDir(path.join(arena, 'home')),
    bin: ensureDir(path.join(arena, 'bin')),
    seed: ensureDir(path.join(arena, 'seed')),
    telemetry: ensureDir(path.join(cellDir, 'telemetry')),
  };

  // 1. The system under test: a checkout pinned to <sha>. Never a symlink to the
  //    working tree — Q3 ("did this instruction edit help?") is only answerable if
  //    a cell can evaluate an older SHA while the harness itself stays current.
  checkoutAnymake(dirs.anymake, sha);
  if (ablation) applyAblation(dirs.anymake, ablation);

  // 2. The product repo's bare "origin", so the gh shim has something real to serve.
  const bare = path.join(arena, 'project-repo.git');
  // -b main matters: a bare repo whose HEAD points at a branch nobody ever pushes
  // clones as an EMPTY worktree, and every oracle then scores a tree that is not there.
  sh('git', ['init', '--bare', '-q', '-b', 'main', bare]);

  // 3. The fixture's frozen working copy, if this scenario has one.
  if (fixture?.repoDir && exists(fixture.repoDir)) {
    copyTree(fixture.repoDir, path.join(dirs.seed, 'repo'));
    seedBareFromFixture(bare, path.join(dirs.seed, 'repo'));
  }
  if (fixture?.workspaceDir && exists(fixture.workspaceDir)) {
    copyTree(fixture.workspaceDir, path.join(dirs.missionControl, projectName));
  }

  // 4. HOME override: opencode config + a git identity, so nothing reaches the
  //    developer's real config.
  //
  //    But isolation must not take the CREDENTIALS with it. opencode keeps them in
  //    <data>/opencode/auth.json, so an arena that redirects XDG_DATA_HOME and copies
  //    nothing has zero credentials — every cell then fails to authenticate, or worse,
  //    blocks on an interactive login with no stdin. Provider env vars survive the
  //    override on their own; auth.json has to be carried in deliberately.
  const ocDir = ensureDir(path.join(dirs.home, '.config', 'opencode'));
  // The S0 control arm and the staircase's first step install no plugin at all: the
  // system under test is simply absent, which is the only honest way to measure what
  // it is worth (§4.1).
  const systemOff = ablation?.systemOff || scenario?.class === 'S0';
  writeJSON(path.join(ocDir, 'opencode.json'), {
    $schema: 'https://opencode.ai/config.json',
    ...(modelConfig?.opencode || {}),
    ...(systemOff ? {} : { plugin: [path.join(dirs.anymake, '.opencode', 'plugins', 'anymake.js')] }),
  });
  seedCredentials(dirs.home);

  writeText(path.join(dirs.home, '.gitconfig'),
    '[user]\n  name = Anymake Eval\n  email = eval@anymake.invalid\n[init]\n  defaultBranch = main\n[commit]\n  gpgsign = false\n');

  // 5. PATH prefix: the gh and ci shims. Installed as executables so the run finds
  //    them the way it would find the real thing.
  installShims(dirs.bin, {
    bare,
    ledger: path.join(dirs.telemetry, 'gh-ledger.jsonl'),
    store: path.join(arena, '.gh-store.json'),
    fixture: fixture?.json || {},
  });

  // 6. The seed brief the run is started from — the prompt, verbatim.
  if (scenario?.briefPath && exists(scenario.briefPath)) {
    writeText(path.join(dirs.seed, 'brief.md'), publicHalf(fs.readFileSync(scenario.briefPath, 'utf8')));
  }

  return {
    dir: arena, ...dirs, bare,
    env: arenaEnv({ arena, dirs, modelConfig, projectName }),
  };
}

/** The hidden acceptance list is stripped before anything reaches the arena (§4.4). */
export function publicHalf(brief) {
  const i = brief.indexOf('## HIDDEN');
  return i >= 0 ? brief.slice(0, i).trimEnd() + '\n' : brief;
}

export function hiddenHalf(brief) {
  const i = brief.indexOf('## HIDDEN');
  return i >= 0 ? brief.slice(i) : '';
}

/**
 * Carry the host's provider credentials into the cell's HOME.
 *
 * Copied, not symlinked: a cell must never be able to write back over the developer's
 * real credentials. If there is nothing to copy, that is not fatal — a provider env
 * var works too — and `credentialCheck()` is what tells the operator which case they
 * are in before a sweep burns an hour proving it.
 */
export function seedCredentials(cellHome) {
  const src = authFile();
  if (!src) return { seeded: false, from: null };
  const dest = path.join(cellHome, '.local', 'share', 'opencode', 'auth.json');
  try {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o600);
    return { seeded: true, from: src };
  } catch (e) {
    log.warn(`could not seed credentials into the arena: ${e.message}`);
    return { seeded: false, from: src };
  }
}

export function authFile() {
  const explicit = process.env.ANYMAKE_EVAL_AUTH_FILE;
  if (explicit) return exists(explicit) ? explicit : null;
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  const candidate = path.join(dataHome, 'opencode', 'auth.json');
  return exists(candidate) ? candidate : null;
}

/** Provider env vars that authenticate on their own, so isolation does not break them. */
const PROVIDER_ENV = [
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY',
  'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'GITHUB_TOKEN', 'AWS_ACCESS_KEY_ID', 'AZURE_API_KEY',
];

/**
 * Answer, before a sweep starts, the question a hung run makes you ask an hour late:
 * can a cell authenticate at all?
 */
export function credentialCheck(env = process.env) {
  const file = authFile();
  const vars = PROVIDER_ENV.filter((v) => env[v]);
  return {
    ok: !!file || vars.length > 0,
    authFile: file,
    envVars: vars,
    note: file ? `auth.json will be copied into each cell's HOME`
      : vars.length ? `no auth.json; relying on ${vars.join(', ')}, which survive the HOME override`
      : 'no auth.json and no provider env var — cells will not be able to authenticate',
  };
}

function arenaEnv({ arena, dirs, modelConfig, projectName }) {
  return {
    ...process.env,
    HOME: dirs.home,
    XDG_CONFIG_HOME: path.join(dirs.home, '.config'),
    XDG_DATA_HOME: path.join(dirs.home, '.local', 'share'),
    PATH: `${dirs.bin}:${process.env.PATH}`,
    MISSION_CONTROL: path.join(arena, 'mission-control'),
    ANYMAKE_PROJECT: projectName,
    GH_SHIM_BARE: path.join(arena, 'project-repo.git'),
    GH_SHIM_LEDGER: path.join(dirs.telemetry, 'gh-ledger.jsonl'),
    GH_SHIM_STORE: path.join(arena, '.gh-store.json'),
    ANYMAKE_EVAL_ARENA: arena,
    ...(modelConfig?.env || {}),
  };
}

function checkoutAnymake(dest, sha) {
  try {
    sh('git', ['-C', REPO_ROOT, 'worktree', 'add', '--detach', '-f', dest, sha]);
    return;
  } catch (e) {
    log.warn('worktree checkout failed, falling back to archive:', String(e.message).split('\n')[0]);
  }
  try {
    const tar = sh('git', ['-C', REPO_ROOT, 'archive', sha], { encoding: 'buffer', maxBuffer: 512 * 1024 * 1024 });
    ensureDir(dest);
    execFileSync('tar', ['-x', '-C', dest], { input: tar });
  } catch (e) {
    throw new Error(`cannot materialize Anymake at ${sha}: ${e.message}`);
  }
}

export function releaseArena(cellDir, keep) {
  const arena = path.join(cellDir, 'arena');
  try { sh('git', ['-C', REPO_ROOT, 'worktree', 'remove', '--force', path.join(arena, 'anymake')]); } catch {}
  if (!keep) fs.rmSync(arena, { recursive: true, force: true });
}

/**
 * Ablating a markdown system means patching prose — the method's weak point (§7.4).
 * The patch applies here; the *assertion* that the removal actually took is checked
 * after the run, and an ablation whose assertion fails is discarded, not scored.
 */
function applyAblation(anymakeDir, ablation) {
  for (const op of ablation.ops || []) {
    const target = path.join(anymakeDir, op.file);
    if (op.action === 'delete') { fs.rmSync(target, { recursive: true, force: true }); continue; }
    if (!exists(target)) { log.warn(`ablation ${ablation.id}: ${op.file} not present`); continue; }
    let body = fs.readFileSync(target, 'utf8');
    if (op.action === 'replace') {
      if (!body.includes(op.find)) { log.warn(`ablation ${ablation.id}: anchor not found in ${op.file}`); continue; }
      body = body.split(op.find).join(op.replace ?? '');
    } else if (op.action === 'append') body += op.text;
    fs.writeFileSync(target, body);
  }
}

function installShims(binDir, cfg) {
  const shimSrc = path.join(HARNESS_ROOT, 'arena', 'shims');
  writeJSON(path.join(binDir, 'shim-config.json'), cfg);
  for (const name of ['gh', 'ci']) {
    const target = path.join(binDir, name);
    writeText(target,
      `#!/usr/bin/env bash\nexec "${process.execPath}" "${path.join(shimSrc, `${name}.mjs`)}" "$@"\n`);
    fs.chmodSync(target, 0o755);
  }
}

function copyTree(src, dest) {
  ensureDir(path.dirname(dest));
  fs.cpSync(src, dest, { recursive: true });
}

function seedBareFromFixture(bare, work) {
  const tmp = `${work}.seed`;
  fs.cpSync(work, tmp, { recursive: true });
  try {
    sh('git', ['-C', tmp, 'init', '-q', '-b', 'main']);
    sh('git', ['-C', tmp, 'add', '-A']);
    sh('git', ['-C', tmp, '-c', 'user.email=eval@anymake.invalid', '-c', 'user.name=Anymake Eval',
      'commit', '-q', '-m', 'chore: fixture baseline']);
    sh('git', ['-C', tmp, 'tag', 'fixture-v1']);
    sh('git', ['-C', tmp, 'push', '-q', '--tags', bare, 'main']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
