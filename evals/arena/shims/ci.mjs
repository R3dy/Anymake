#!/usr/bin/env node
// The local check runner — what `gh pr checks` reports (§3.4).
//
// It runs the project's REAL test and lint commands rather than stubbing a green
// tick, because "Definition of CI Passing" is one of the rules under test. It also
// counts tests, so the arbiter's "a PR that passes CI with 0 tests has a broken CI
// configuration — escalate" has something mechanical to fire on.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const dir = path.resolve(arg('dir', process.cwd()));
const asJson = process.argv.includes('--json');

const pkg = readPkg(dir);
const checks = [];
let testCount = 0;

for (const [name, cmd] of discoverCommands(pkg, dir)) {
  const started = Date.now();
  try {
    const stdout = execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60 * 1000 });
    if (name === 'test') testCount = countTests(stdout);
    checks.push({ name, cmd, passed: true, ms: Date.now() - started, detail: lastLine(stdout) });
  } catch (e) {
    const output = `${e.stdout || ''}${e.stderr || ''}`;
    if (name === 'test') testCount = countTests(output);
    checks.push({ name, cmd, passed: false, ms: Date.now() - started, detail: lastLine(output) || String(e.message).split('\n')[0] });
  }
}

const passed = checks.length > 0 && checks.every((c) => c.passed);
if (asJson) console.log(JSON.stringify({ passed, testCount, checks }, null, 2));
else {
  for (const c of checks) console.log(`${c.name}\t${c.passed ? 'pass' : 'fail'}\t${c.detail}`);
  console.log(`tests counted: ${testCount}`);
}
process.exit(passed && testCount > 0 ? 0 : 1);

function readPkg(d) { try { return JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')); } catch { return null; } }

/** Commands in the order a contributor would run them locally. */
function discoverCommands(pkg, d) {
  const cmds = [];
  if (pkg?.scripts) {
    if (pkg.scripts.lint) cmds.push(['lint', 'npm run --silent lint']);
    if (pkg.scripts.typecheck) cmds.push(['typecheck', 'npm run --silent typecheck']);
    if (pkg.scripts.test) cmds.push(['test', 'npm test --silent']);
  }
  if (!cmds.length && fs.existsSync(path.join(d, 'pytest.ini'))) cmds.push(['test', 'python3 -m pytest -q']);
  if (!cmds.length && fs.existsSync(path.join(d, 'go.mod'))) cmds.push(['test', 'go test ./...']);
  if (!cmds.length && fs.existsSync(path.join(d, 'Makefile'))) cmds.push(['test', 'make test']);
  return cmds;
}

/** Deliberately format-agnostic: a runner that reports nothing countable reports 0. */
function countTests(output) {
  const pats = [
    /(\d+)\s+pass(?:ed|ing)/i, /Tests:\s+(?:\d+\s+failed,\s+)?(\d+)\s+passed/i,
    /ok\s+(\d+)\s+-/g, /(\d+)\s+tests?\s+(?:ran|completed)/i, /^PASS.*\((\d+) tests\)/im,
  ];
  for (const p of pats) { const m = output.match(p); if (m) return Number(m[1] ?? m[0].match(/\d+/)[0]); }
  const ticks = (output.match(/^\s*(?:✓|√|ok\b)/gm) || []).length;
  return ticks;
}

const lastLineOf = (s) => s.trim().split('\n').filter(Boolean).pop() || '';
function lastLine(s) { return lastLineOf(String(s || '')).slice(0, 200); }
