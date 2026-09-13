// Post-run mechanical checks — §3.6 row 4.
//
// Crude, cheap, and high-yield. FID-07 in particular earns its place despite being
// a regex pass: an artifact set full of "[Specific, testable criterion]" is the most
// common way these systems produce impressive-looking, worthless output, and the
// Product Owner Proxy is supposed to catch exactly that — so this doubles as a
// direct test of the proxy.
import path from 'path';
import { readText, walk } from '../lib/util.mjs';

const PLACEHOLDER_PATTERNS = [
  /\[(?:Specific|Describe|Your|TODO|e\.g\.|placeholder)[^\]\n]{0,80}\]/gi,
  /\b(?:TODO|FIXME|XXX|HACK)\b/g,
  /\bnot implemented\b/gi,
  /\blorem ipsum\b/gi,
  /\bcoming soon\b/gi,
  /<[A-Z_]{3,}>/g,
];

// Deliberately narrow: a pattern that fires on every base64 string produces noise,
// and a noisy security probe gets ignored, which is worse than not having one.
const SECRET_PATTERNS = [
  { id: 'aws-akid', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'github-pat', re: /\bghp_[A-Za-z0-9]{36}\b/g },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { id: 'generic-secret', re: /\b(?:api[_-]?key|secret[_-]?key|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-/+]{16,}["']/gi },
  { id: 'stripe-live', re: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
];

const TEXTY = /\.(md|mdx|txt|json|ya?ml|[mc]?[jt]sx?|py|go|rb|rs|java|html|css|sql|env|toml|ini|sh)$/i;

export function scanTree(root) {
  const files = walk(root).filter((f) => TEXTY.test(f));
  const placeholders = [];
  const secrets = [];
  for (const rel of files) {
    const body = readText(path.join(root, rel));
    if (!body) continue;
    for (const re of PLACEHOLDER_PATTERNS) {
      for (const m of body.matchAll(re)) {
        placeholders.push({ file: rel, hit: m[0].slice(0, 60), line: lineOf(body, m.index) });
      }
    }
    for (const { id, re } of SECRET_PATTERNS) {
      for (const m of body.matchAll(re)) {
        secrets.push({ file: rel, kind: id, line: lineOf(body, m.index) });
      }
    }
  }
  return { files: files.length, placeholders, secrets };
}

const lineOf = (body, idx) => body.slice(0, idx).split('\n').length;

/**
 * FID-09 — BOARD.md is a faithful projection of board-state.json.
 * The rendered markdown is what a human reads; the JSON is what the system acts on.
 * When they disagree, one of the two is lying to somebody.
 */
export function boardAgreement(boardMd, state) {
  if (!state?.stories?.length) return { value: null, note: 'no board state' };
  let agree = 0;
  const mismatches = [];
  for (const s of state.stories) {
    const row = new RegExp(`^\\|[^|]*\\b${escapeRe(String(s.id))}\\b[\\s\\S]*?$`, 'm').exec(boardMd);
    if (row && new RegExp(escapeRe(String(s.status)).replace(/_/g, '[_ ]'), 'i').test(row[0])) agree++;
    else mismatches.push({ story: s.id, stateStatus: s.status, boardRow: row ? row[0].slice(0, 90) : null });
  }
  return { value: agree / state.stories.length, evidence: { mismatches } };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * CNF-06 — every artifact the type's manifest mandates, present and template-shaped.
 * "Template-shaped" means it still carries the template's required headings; a file
 * that exists but is a stub is not an artifact, it is a placeholder with a filename.
 */
export function artifactCompleteness(projectDir, required = []) {
  if (!required.length) return { value: null, note: 'type declares no required artifacts' };
  const results = required.map((r) => {
    const rel = typeof r === 'string' ? r : r.path;
    const headings = (typeof r === 'string' ? [] : r.headings) || [];
    const body = readText(path.join(projectDir, rel));
    const present = body.length > 0;
    const shaped = present && headings.every((h) => body.includes(h));
    return { path: rel, present, shaped, ok: present && shaped };
  });
  return { value: results.filter((r) => r.ok).length / results.length, evidence: { results } };
}
