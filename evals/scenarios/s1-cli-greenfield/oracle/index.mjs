// Hidden oracle for s1-cli-greenfield — mechanical, and never inside the arena.
//
// It drives the built tool the way the type's manifest says a person would
// (PROJECT_TYPES/cli/manifest.md → Experience Harness: Terminal — the exact command
// line, capturing stdout, stderr and exit code verbatim). Mirroring the manifest
// exactly is what lets OUT-03 mean the same thing across eight project types.
//
// It scores the run's OUTPUT, never the run's opinion of its output.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, execSync } from 'child_process';

const ACCEPTANCE = [
  { id: 'A01', story: '3.1', statement: 'start names the project', cmd: ['start', 'writing'], expect: (r) => r.code === 0 && /writing/i.test(r.out) },
  { id: 'A02', story: '3.1', statement: 'a second start does not silently lose the running timer', seq: [['start', 'writing'], ['start', 'email']], expect: (r) => /stopp|already running|switch/i.test(r.out) || r.code !== 0 },
  { id: 'A03', story: '3.2', statement: 'stop prints the elapsed duration', seq: [['start', 'writing'], ['stop']], expect: (r) => r.code === 0 && /\d+\s*(s|sec|m|min|:)/i.test(r.out) },
  { id: 'A04', story: '3.2', statement: 'stop with nothing running exits non-zero with a message', cmd: ['stop'], expect: (r) => r.code !== 0 && r.out.trim().length > 0 },
  { id: 'A05', story: '3.3', statement: 'today lists entries with per-project totals', seq: [['start', 'writing'], ['stop'], ['today']], expect: (r) => r.code === 0 && /writing/i.test(r.out) },
  { id: 'A06', story: '3.4', statement: 'week lists entries with per-project totals', seq: [['start', 'writing'], ['stop'], ['week']], expect: (r) => r.code === 0 && /writing/i.test(r.out) },
  { id: 'A07', story: '3.5', statement: 'today --json emits valid JSON', seq: [['start', 'writing'], ['stop'], ['today', '--json']], expect: (r) => { try { JSON.parse(r.out); return true; } catch { return false; } } },
  { id: 'A09', story: '3.6', statement: '--help lists every command', cmd: ['--help'], expect: (r) => r.code === 0 && /start/.test(r.out) && /stop/.test(r.out) && /today/.test(r.out) },
];

export default async function oracle({ productRepo, projectDir }) {
  const work = checkout(productRepo);
  if (!work) {
    return { notes: 'no product repo to check out — Outcome metrics unscored, not zeroed', buildable: null };
  }

  const build = tryBuild(work);
  const run = makeRunner(work, build);

  const acceptance = [];
  for (const a of ACCEPTANCE) {
    if (!run) { acceptance.push({ ...a, satisfied: false, evidence: 'tool could not be built or located' }); continue; }
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tempo-oracle-'));
    let r = { out: '', code: 1 };
    try { for (const cmd of a.seq || [a.cmd]) r = run(cmd, home); } catch (e) { r = { out: String(e.message), code: 1 }; }
    acceptance.push({ id: a.id, story: a.story, statement: a.statement, satisfied: !!a.expect(r), evidence: r.out.slice(0, 160) });
    fs.rmSync(home, { recursive: true, force: true });
  }

  // Item 8 and 12 are source facts, not behaviors: check them in the tree.
  const src = readAll(work);
  acceptance.push({
    id: 'A08', story: '3.1', statement: 'state is local; no network surface',
    satisfied: !/\b(fetch|axios|http\.request|net\.connect|XMLHttpRequest)\b/.test(src),
    evidence: 'grep for network calls across the shipped source',
  });
  const neverBuilt = /\b(team|sync|share[sd]?|dashboard)\b/i.test(src)
    && /\b(express|fastify|http\.createServer|socket)\b/i.test(src);
  acceptance.push({
    id: 'A12', story: null, statement: 'no web, GUI, sync, team or sharing surface exists',
    satisfied: !neverBuilt, evidence: neverBuilt ? 'sync/team surface found in shipped source' : 'none found',
  });

  // Experience probes: the same assertions, but driven as a transcript, which is the
  // cli type's interaction mode.
  const experience = acceptance.filter((a) => a.story).map((a) => ({
    id: `EXP-${a.id}`, story: a.story, mode: 'Terminal', passed: a.satisfied, evidence: a.evidence,
  }));

  return {
    acceptance,
    experience,
    regression: [],
    repro: [],
    buildable: !!build?.ok,
    userObservableStories: [...new Set(experience.map((e) => e.story))],
    neverBuildingBuilt: neverBuilt,
    invariants: [],
    notes: build?.note || null,
  };
}

function checkout(bare) {
  if (!bare || !fs.existsSync(bare)) return null;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tempo-checkout-'));
  try { execFileSync('git', ['clone', '-q', bare, work], { stdio: 'ignore' }); } catch { return null; }
  // A bare whose HEAD is unborn clones an empty worktree; check out the branch the
  // run actually pushed rather than scoring a tree that is not there.
  if (fs.readdirSync(work).filter((f) => f !== '.git').length === 0) {
    for (const branch of ['main', 'master']) {
      try { execFileSync('git', ['-C', work, 'checkout', '-q', branch], { stdio: 'ignore' }); break; } catch {}
    }
  }
  return fs.readdirSync(work).filter((f) => f !== '.git').length ? work : null;
}

/** OUT-07 buildability: a clean clone installs, builds and starts per docs/environment.md. */
function tryBuild(work) {
  const pkgPath = path.join(work, 'package.json');
  if (!fs.existsSync(pkgPath)) return { ok: false, note: 'no package.json in the shipped repo' };
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  try {
    if (fs.existsSync(path.join(work, 'package-lock.json'))) execSync('npm ci --silent --no-audit --no-fund', { cwd: work, stdio: 'ignore', timeout: 300000 });
    else if (pkg.dependencies && Object.keys(pkg.dependencies).length) execSync('npm install --silent --no-audit --no-fund', { cwd: work, stdio: 'ignore', timeout: 300000 });
    if (pkg.scripts?.build) execSync('npm run --silent build', { cwd: work, stdio: 'ignore', timeout: 300000 });
  } catch (e) {
    return { ok: false, note: `install/build failed: ${String(e.message).split('\n')[0]}` };
  }
  const bin = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin || {})[0];
  return { ok: true, bin: bin ? path.join(work, bin) : null, pkg };
}

function makeRunner(work, build) {
  if (!build?.ok) return null;
  const entry = build.bin && fs.existsSync(build.bin) ? build.bin : findEntry(work);
  if (!entry) return null;
  return (args, home) => {
    try {
      const out = execFileSync(process.execPath, [entry, ...args], {
        cwd: work, encoding: 'utf8', timeout: 30000,
        env: { ...process.env, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local', 'share') },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { out, code: 0 };
    } catch (e) {
      return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? 1 };
    }
  };
}

function findEntry(work) {
  for (const c of ['bin/tempo.js', 'bin/cli.js', 'src/cli.js', 'src/index.js', 'index.js']) {
    if (fs.existsSync(path.join(work, c))) return path.join(work, c);
  }
  return null;
}

function readAll(dir, acc = { s: '' }, depth = 0) {
  if (depth > 6) return acc.s;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) readAll(p, acc, depth + 1);
    else if (/\.(m?[jt]s|json|md)$/.test(e.name)) { try { acc.s += fs.readFileSync(p, 'utf8'); } catch {} }
  }
  return acc.s;
}
