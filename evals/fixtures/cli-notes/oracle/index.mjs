// Hidden oracle for cli-notes — regression, repro, experience, invariants.
//
// Three suites, each answering a different question the design separates on purpose:
//   regression — must stay GREEN (catches "fixed the bug, broke the app")
//   repro      — must go RED → GREEN (the defect is actually fixed)
//   experience — an independent drive in the type's interaction mode (Terminal)
//
// None of them is visible from inside the arena, so a run cannot satisfy them by
// reading them.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export default async function oracle({ productRepo }) {
  const work = checkout(productRepo);
  if (!work) return { notes: 'no product repo — Outcome metrics unscored, not zeroed', buildable: null };

  const regression = runSuite(work, path.join(HERE, 'regression'));
  const repro = runSuite(work, path.join(HERE, 'repro'));
  const experience = drive(work);
  const invariants = checkInvariants(work);

  return {
    regression: regression.map((r) => ({ ...r, wasGreenBefore: true })),
    repro: repro.map((r) => ({ ...r, wentRedToGreen: r.passed })),
    experience,
    acceptance: repro.map((r) => ({ id: r.id, story: r.story, statement: r.name, satisfied: r.passed, evidence: r.detail })),
    invariants,
    buildable: fs.existsSync(path.join(work, 'package.json')),
    userObservableStories: [...new Set(experience.map((e) => e.story).filter(Boolean))],
    notes: null,
  };
}

function checkout(bare) {
  if (!bare || !fs.existsSync(bare)) return null;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-oracle-'));
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

/** Each suite file is a plain node --test file, run against the CANDIDATE tree. */
function runSuite(work, dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.mjs'))) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-home-'));
    let passed = true, detail = '';
    try {
      detail = execFileSync(process.execPath, ['--test', path.join(dir, f)], {
        encoding: 'utf8', cwd: work, timeout: 120000,
        env: { ...process.env, NOTES_HOME: home, NOTES_UNDER_TEST: work },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) { passed = false; detail = `${e.stdout || ''}${e.stderr || ''}`; }
    results.push({ id: f.replace('.test.mjs', ''), name: f, story: storyOf(f), passed, detail: lastLines(detail) });
    fs.rmSync(home, { recursive: true, force: true });
  }
  return results;
}

const storyOf = (f) => (/story-([\d.]+)/.exec(f) || [])[1] || null;
const lastLines = (s) => String(s || '').trim().split('\n').slice(-3).join(' ').slice(0, 200);

/** Terminal mode, per PROJECT_TYPES/cli/manifest.md — the exact command line. */
function drive(work) {
  const bin = path.join(work, 'bin', 'notes.js');
  if (!fs.existsSync(bin)) return [{ id: 'EXP-cli', story: null, mode: 'Terminal', passed: false, evidence: 'bin/notes.js is missing from the shipped tree' }];
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-drive-'));
  const run = (args) => {
    try {
      return { out: execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, NOTES_HOME: home }, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }), code: 0 };
    } catch (e) { return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? 1 }; }
  };
  const steps = [];
  run(['add', 'groceries', 'milk and eggs']);
  const byTitle = run(['search', 'groceries']);
  steps.push({ id: 'EXP-title-search', story: '1', mode: 'Terminal', passed: byTitle.code === 0 && /groceries/.test(byTitle.out),
    evidence: `notes search groceries → exit ${byTitle.code}: ${byTitle.out.trim().slice(0, 80)}` });
  const byBody = run(['search', 'milk']);
  steps.push({ id: 'EXP-body-search', story: '1', mode: 'Terminal', passed: byBody.code === 0 && /groceries/.test(byBody.out),
    evidence: `notes search milk → exit ${byBody.code}` });
  const miss = run(['search', 'zzzz']);
  steps.push({ id: 'EXP-miss-exit', story: '1', mode: 'Terminal', passed: miss.code !== 0,
    evidence: `a search with no hits must exit non-zero; got ${miss.code}` });
  fs.rmSync(home, { recursive: true, force: true });
  return steps;
}

/** The fixture's own mechanical invariant checks — ground-truth/system-map.md. */
function checkInvariants(work) {
  const cli = read(path.join(work, 'bin', 'notes.js'));
  const store = read(path.join(work, 'src', 'store.js'));
  return [
    { id: 'INV-search-single-path', held: !/\.filter\s*\(/.test(cli),
      note: 'search() is the single search path — the CLI must not filter notes itself' },
    { id: 'INV-exit-codes', held: /process\.exit\(1\)/.test(cli),
      note: 'every command exits non-zero on failure' },
    { id: 'INV-title-in-haystack', held: /n\.title/.test(store) && /search/.test(store),
      note: 'the root cause is fixed in the store, not worked around in the CLI' },
  ];
}

const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
