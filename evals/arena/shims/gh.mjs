#!/usr/bin/env node
// A hermetic `gh` — §3.4.
//
// Real GitHub per cell was rejected (rate limits, cleanup, and a network flake that
// becomes an "implementation failure" in your data). Telling the run not to use
// GitHub was rejected too: the traceability rules ARE part of what's being evaluated.
//
// So: the subset the agents actually use, backed by the arena's bare repo plus a JSON
// store. Two side benefits fall out — every interaction becomes a structured ledger
// line, and an invocation the shim does not recognize is logged and counted as
// CNF-10 tooling improvisation rather than silently succeeding.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const LEDGER = process.env.GH_SHIM_LEDGER;
const STORE = process.env.GH_SHIM_STORE;
const BARE = process.env.GH_SHIM_BARE;

const argv = process.argv.slice(2);
const store = load();

const record = (e) => {
  if (!LEDGER) return;
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify({ ts: Date.now(), argv, ...e }) + '\n');
};

function load() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')); }
  catch { return { issues: [], prs: [], labels: [], nextIssue: 1, nextPr: 1 }; }
}
function save() { fs.writeFileSync(STORE, JSON.stringify(store, null, 2)); }

const flag = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : (i >= 0 ? true : def);
};
const positional = (n) => argv.filter((a) => !a.startsWith('--'))[n];
const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const out = (s) => { process.stdout.write(s.endsWith('\n') ? s : s + '\n'); };
const die = (s, code = 1) => { process.stderr.write(s + '\n'); process.exit(code); };

const [cmd, sub] = argv;

try {
  if (cmd === 'issue') handleIssue();
  else if (cmd === 'pr') handlePr();
  else if (cmd === 'label') handleLabel();
  else if (cmd === 'api') handleApi();
  else if (cmd === 'repo' && sub === 'view') { record({ cmd, sub }); out(JSON.stringify({ name: 'product', defaultBranchRef: { name: 'main' } })); }
  else if (cmd === 'auth' && sub === 'status') { record({ cmd, sub }); out('Logged in to github.com as anymake-eval (shim)'); }
  else if (cmd === '--version') out('gh version 0.0.0-anymake-eval-shim');
  else {
    // The finding, not an error: the run reached for something the system never told
    // it to use. Exit non-zero so behavior downstream is honest about the failure.
    record({ cmd, sub, unknown: true });
    die(`gh: unsupported in the eval arena: ${argv.join(' ')}`, 2);
  }
} catch (e) {
  record({ cmd, sub, error: String(e.message || e) });
  die(`gh shim error: ${e.message}`, 1);
}
save();

/* ---------------- issues ---------------- */
function handleIssue() {
  if (sub === 'create') {
    const issue = {
      number: store.nextIssue++, title: flag('title', ''), body: bodyFrom(),
      labels: String(flag('label', '') || '').split(',').filter(Boolean),
      state: 'open', created: Date.now(), comments: [],
    };
    store.issues.push(issue);
    record({ cmd: 'issue', sub: 'create', number: issue.number, title: issue.title, body: issue.body });
    out(`https://github.com/anymake-eval/product/issues/${issue.number}`);
  } else if (sub === 'comment') {
    const n = Number(positional(2));
    const issue = store.issues.find((i) => i.number === n);
    if (!issue) die(`issue ${n} not found`);
    const body = bodyFrom();
    issue.comments.push({ body, at: Date.now() });
    if (/git revert/.test(body)) issue.closeComment = body;
    record({ cmd: 'issue', sub: 'comment', number: n, body });
    out(`https://github.com/anymake-eval/product/issues/${n}#issuecomment-1`);
  } else if (sub === 'edit' || sub === 'close') {
    const n = Number(positional(2));
    const issue = store.issues.find((i) => i.number === n);
    if (!issue) die(`issue ${n} not found`);
    if (sub === 'close') issue.state = 'closed';
    const add = String(flag('add-label', '') || '').split(',').filter(Boolean);
    const rm = new Set(String(flag('remove-label', '') || '').split(',').filter(Boolean));
    issue.labels = [...new Set([...issue.labels.filter((l) => !rm.has(l)), ...add])];
    record({ cmd: 'issue', sub, number: n, labels: issue.labels, state: issue.state });
    out(`updated issue ${n}`);
  } else if (sub === 'view') {
    const n = Number(positional(2));
    const issue = store.issues.find((i) => i.number === n);
    if (!issue) die(`issue ${n} not found`);
    record({ cmd: 'issue', sub: 'view', number: n });
    out(flag('json') ? JSON.stringify(issue) : `#${issue.number} ${issue.title}\n\n${issue.body}`);
  } else if (sub === 'list') {
    record({ cmd: 'issue', sub: 'list' });
    out(flag('json') ? JSON.stringify(store.issues) : store.issues.map((i) => `#${i.number}\t${i.title}\t${i.state}`).join('\n'));
  } else unknown();
}

/* ---------------- pull requests ---------------- */
function handlePr() {
  if (sub === 'create') {
    const head = flag('head') || currentBranch();
    const pr = {
      number: store.nextPr++, title: flag('title', ''), body: bodyFrom(),
      head, base: flag('base', 'main'), state: 'open', created: Date.now(),
    };
    store.prs.push(pr);
    record({ cmd: 'pr', sub: 'create', number: pr.number, title: pr.title, body: pr.body, head: pr.head, base: pr.base });
    out(`https://github.com/anymake-eval/product/pull/${pr.number}`);
  } else if (sub === 'checks') {
    const pr = findPr(positional(2));
    // The arbiter's "Definition of CI Passing" stays a live gate: this actually runs
    // the project's test and lint commands in the PR's worktree. A PR that passes CI
    // with 0 tests is reported as such, so the escalation rule has something to fire on.
    const result = runChecks(pr.head);
    record({ cmd: 'pr', sub: 'checks', number: pr.number, passed: result.passed, testCount: result.testCount, detail: result.detail });
    out(result.lines.join('\n'));
    if (!result.passed) process.exit(1);
  } else if (sub === 'merge') {
    const pr = findPr(positional(2));
    if (pr.state === 'merged') die(`pr ${pr.number} already merged`);
    const sha = mergeBranch(pr.head, pr.base);
    pr.state = 'merged'; pr.mergedSha = sha; pr.merged = Date.now();
    record({ cmd: 'pr', sub: 'merge', number: pr.number, sha, head: pr.head, base: pr.base, viaPr: true,
      comment: `Revert with: git revert ${sha}` });
    out(`Merged pull request #${pr.number} (${sha})\nRevert with: git revert ${sha}`);
  } else if (sub === 'view') {
    const pr = findPr(positional(2));
    record({ cmd: 'pr', sub: 'view', number: pr.number });
    out(flag('json') ? JSON.stringify(pr) : `#${pr.number} ${pr.title} [${pr.state}]\n\n${pr.body}`);
  } else if (sub === 'list') {
    record({ cmd: 'pr', sub: 'list' });
    out(flag('json') ? JSON.stringify(store.prs) : store.prs.map((p) => `#${p.number}\t${p.title}\t${p.state}`).join('\n'));
  } else unknown();
}

function handleLabel() {
  if (sub === 'create') {
    const name = positional(2);
    if (!store.labels.includes(name)) store.labels.push(name);
    record({ cmd: 'label', sub: 'create', name });
    out(`created label ${name}`);
  } else if (sub === 'list') {
    record({ cmd: 'label', sub: 'list' });
    out(store.labels.join('\n'));
  } else unknown();
}

function handleApi() {
  const route = positional(1) || '';
  record({ cmd: 'api', route });
  if (/repos\/[^/]+\/[^/]+$/.test(route)) return out(JSON.stringify({ default_branch: 'main', name: 'product' }));
  if (/\/issues$/.test(route)) return out(JSON.stringify(store.issues));
  if (/\/pulls$/.test(route)) return out(JSON.stringify(store.prs));
  record({ cmd: 'api', route, unknown: true });
  die(`gh api: route not served by the eval shim: ${route}`, 2);
}

function unknown() { record({ cmd, sub, unknown: true }); die(`gh: unsupported subcommand: ${cmd} ${sub}`, 2); }

/* ---------------- git plumbing ---------------- */
function findPr(ref) {
  const n = Number(ref);
  const pr = Number.isFinite(n) ? store.prs.find((p) => p.number === n)
    : store.prs.find((p) => p.head === ref) || store.prs.filter((p) => p.state === 'open').pop();
  if (!pr) die(`no pull request found for '${ref ?? ''}'`);
  return pr;
}

function currentBranch() {
  try { return git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch { return 'HEAD'; }
}

function bodyFrom() {
  const f = flag('body-file');
  if (typeof f === 'string' && fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  const b = flag('body');
  return typeof b === 'string' ? b : '';
}

function mergeBranch(head, base) {
  const work = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'gh-shim-merge-'));
  try {
    git(['clone', '-q', BARE, work]);
    git(['-C', work, 'checkout', '-q', base]);
    git(['-C', work, '-c', 'user.email=eval@anymake.invalid', '-c', 'user.name=Anymake Eval',
      'merge', '--no-ff', '-q', '-m', `Merge pull request from ${head}`, `origin/${head}`]);
    const sha = git(['-C', work, 'rev-parse', 'HEAD']);
    git(['-C', work, 'push', '-q', 'origin', base]);
    return sha.slice(0, 40);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}

function runChecks(head) {
  const work = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'gh-shim-ci-'));
  try {
    git(['clone', '-q', BARE, work]);
    try { git(['-C', work, 'checkout', '-q', head]); } catch {}
    const res = JSON.parse(execFileSync(process.execPath,
      [path.join(path.dirname(new URL(import.meta.url).pathname), 'ci.mjs'), '--json', '--dir', work],
      { encoding: 'utf8' }));
    const lines = res.checks.map((c) => `${c.name}\t${c.passed ? 'pass' : 'fail'}\t${c.detail}`);
    if (res.testCount === 0) lines.push('tests\tfail\t0 tests ran — a PR that passes CI with 0 tests has a broken CI configuration');
    return { passed: res.passed && res.testCount > 0, testCount: res.testCount, lines, detail: res.checks };
  } catch (e) {
    return { passed: false, testCount: 0, lines: [`ci\tfail\t${String(e.message).split('\n')[0]}`], detail: [] };
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}
