// Instruction attention and yield — §7.6.
//
// Per instruction file, across the sweep: who read it, what it cost, how many of its
// rules a run had occasion to apply, and how many of those it broke. Three findings
// fall out that nothing else in the harness would surface — dead files, expensive
// files, and unread-but-violated, which is a *discovery* failure with a completely
// different fix from a wording one.
import fs from 'fs';
import path from 'path';
import { walk, readText, round, exists } from '../lib/util.mjs';

/** Every instruction file the pinned checkout ships, whether or not anyone read it. */
export function instructionFiles(anymakeDir) {
  if (!exists(anymakeDir)) return [];
  const roots = ['AGENTS', 'PHASE_GUIDES', 'TEMPLATES', 'skills', 'PROJECT_TYPES'];
  const out = [];
  for (const r of roots) {
    const dir = path.join(anymakeDir, r);
    if (!exists(dir)) continue;
    for (const rel of walk(dir)) if (rel.endsWith('.md')) out.push(`${r}/${rel}`);
  }
  if (exists(path.join(anymakeDir, 'AGENTS.md'))) out.push('AGENTS.md');
  return out.sort();
}

/** Rough rule count: imperative bullets and must/never lines. Crude, but consistent. */
export function ruleCount(body) {
  const bullets = (body.match(/^\s*[-*]\s+\*{0,2}(?:Never|Always|Must|Do not|Don't|MUST|NEVER)\b/gmi) || []).length;
  const sentences = (body.match(/\b(?:must never|must always|must not|never|always)\b/gi) || []).length;
  return Math.max(bullets, Math.round(sentences / 2));
}

const VERDICTS = {
  'load-bearing': 'read by the agents it was written for, and its rules get exercised',
  expensive: 'high token share, few rules exercised',
  dead: 'never read, in any cell — the content is unreachable or the discovery path is broken',
  'unread-but-violated': 'the rule exists, the run broke it, and the file never entered that agent\'s context',
};

/**
 * @param cells  [{ trace, violations: [{ file, rule, agentRole }] }]
 */
export function instructionTable(cells, anymakeDir) {
  const files = instructionFiles(anymakeDir);
  const totalInput = cells.reduce((a, c) => a + c.trace.totalInputTokens(), 0) || 1;

  const reads = new Map();   // file -> { count, tokens, roles:Set }
  for (const c of cells) {
    for (const r of c.trace.systemReads()) {
      if (!reads.has(r.file)) reads.set(r.file, { count: 0, tokens: 0, roles: new Set() });
      const e = reads.get(r.file);
      e.count++; e.tokens += r.tokens; e.roles.add(r.role);
    }
  }

  const violations = new Map();
  for (const c of cells) for (const v of c.violations || []) {
    if (!violations.has(v.file)) violations.set(v.file, []);
    violations.get(v.file).push(v);
  }

  const rows = files.map((f) => {
    const r = reads.get(f) || { count: 0, tokens: 0, roles: new Set() };
    const body = readText(path.join(anymakeDir, f));
    const rules = ruleCount(body);
    const vi = violations.get(f) || [];
    const exercised = new Set(vi.map((v) => v.rule)).size;
    const share = r.tokens / totalInput;

    let verdict;
    if (r.count === 0 && vi.length > 0) verdict = 'unread-but-violated';
    else if (r.count === 0) verdict = 'dead';
    else if (share > 0.08 && exercised === 0) verdict = 'expensive';
    else verdict = 'load-bearing';

    return {
      f, r: r.count, tok: r.count ? Math.round(r.tokens / r.count) : 0, total: r.tokens,
      pct: round(share, 4), roles: [...r.roles], rules, ex: exercised, vi: vi.length, v: verdict,
      why: VERDICTS[verdict],
    };
  });

  return rows.sort((a, b) => b.pct - a.pct || b.vi - a.vi);
}

/**
 * §7.2's hub-bootstrap line item: the plugin injects the whole hub skill into the
 * first user message of every session, so that injection has a fixed per-session
 * price. Stating it in dollars is the point.
 */
export function bootstrapCost(anymakeDir, perSessionCells) {
  const hub = path.join(anymakeDir, 'skills', 'anymake', 'SKILL.md');
  if (!exists(hub)) return null;
  const bytes = fs.statSync(hub).size;
  const tokens = Math.round(bytes / 4);            // the usual rough conversion, labeled as such
  return { bytes, approxTokens: tokens, sessions: perSessionCells, note: 'approximate — bytes/4, not a tokenizer count' };
}
