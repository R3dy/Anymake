// Shared helpers for the eval harness.
//
// Zero dependencies, Node ESM only — same constraint as .opencode/verify-plugin.mjs
// and for the same reason (ADR-014, docs/design/eval-harness.md §11.1): the harness
// is a developer tool that must run against an *older* Anymake checkout without
// installing anything.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(HARNESS_ROOT, '..');

/* ---------- fs ---------- */

export const readJSON = (p, fallback = undefined) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { if (fallback !== undefined) return fallback; throw e; }
};

export const writeJSON = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
};

export const readText = (p, fallback = '') => {
  try { return fs.readFileSync(p, 'utf8'); } catch { return fallback; }
};

export const writeText = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};

export const appendJSONL = (p, obj) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(obj) + '\n');
};

export const readJSONL = (p) => readText(p).split('\n').filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);

export const exists = (p) => fs.existsSync(p);

export const ensureDir = (p) => { fs.mkdirSync(p, { recursive: true }); return p; };

export const rmrf = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch {} };

/** Every file under `dir`, repo-relative, skipping .git and node_modules. */
export function walk(dir, base = dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.isFile()) out.push(path.relative(base, full));
  }
  return out;
}

/* ---------- stats ---------- */

export const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/** Quartiles by the "exclusive median" convention — same one a boxplot uses. */
export const iqr = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length < 2) return v.length ? [v[0], v[0]] : [null, null];
  const q = (p) => {
    const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return v[lo] + (v[hi] - v[lo]) * (i - lo);
  };
  return [round(q(0.25)), round(q(0.75))];
};

export const round = (n, d = 0) => {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export const sum = (xs) => xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
export const mean = (xs) => { const v = xs.filter(Number.isFinite); return v.length ? sum(v) / v.length : null; };

/** Do two [lo,hi] intervals overlap? Used for the "not separated at n=k" marker (§6.8). */
export const overlaps = (a, b) =>
  a && b && a[0] != null && b[0] != null && a[0] <= b[1] && b[0] <= a[1];

/* ---------- determinism ---------- */

/** mulberry32 — a tiny seeded PRNG so cell ordering and the mock adapter are reproducible. */
export function rng(seed) {
  let a = typeof seed === 'string' ? hash32(seed) : (seed >>> 0);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Fisher-Yates with a seeded source — §9.1 randomized cell order, reproducibly. */
export function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- formatting ---------- */

export const runStamp = (d = new Date()) => d.toISOString().replace(/:/g, '-').replace(/\..+$/, '');

export const fmtDuration = (ms) => {
  if (!Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return `${m}m${String(r).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

/* ---------- logging ---------- */

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
let level = LEVELS[process.env.ANYMAKE_EVAL_LOG || 'info'] ?? 3;
export const setLogLevel = (l) => { level = LEVELS[l] ?? level; };
export const log = {
  error: (...a) => level >= 1 && console.error('  ERROR ', ...a),
  warn: (...a) => level >= 2 && console.error('  WARN  ', ...a),
  info: (...a) => level >= 3 && console.log('  ', ...a),
  step: (...a) => level >= 3 && console.log('\n' + a.join(' ')),
  debug: (...a) => level >= 4 && console.log('  debug ', ...a),
};

/* ---------- misc ---------- */

export const groupBy = (xs, key) => {
  const m = new Map();
  for (const x of xs) {
    const k = typeof key === 'function' ? key(x) : x[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};

export const pct = (n, d) => (d ? n / d : null);

/** Bounded parallel map — the cell scheduler's whole concurrency story (§9.1). */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
