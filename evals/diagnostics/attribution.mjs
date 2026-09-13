// Defect attribution and the fix list — §7.7, §7.8.
//
// Every oracle failure, probe failure, escalation and retry is attributed to a stage
// and a cause class. The classes are chosen so each implies a DIFFERENT edit — a
// taxonomy that does not change what you would do is decoration.
//
// The mechanical split that matters most is unread vs. read-and-violated: it comes
// straight out of files_read, and it is the one a human reviewer would get wrong by
// guessing. The capability class falls out of the matrix for free — the same defect
// appearing only in the weaker cells is evidence about the model, not about your prose.
import { round, groupBy } from '../lib/util.mjs';

export const CAUSES = {
  'instruction-absent': { label: 'instruction absent', fix: 'Write the rule.' },
  'instruction-unread': { label: 'instruction unread', fix: 'Discovery/salience: move it into the role prompt, inline it in the brief, or shorten the file it is buried in.' },
  'instruction-violated': { label: 'instruction read but violated', fix: 'Wording/salience: shorten, make it imperative, or add a mechanical check.' },
  'rule-wrong': { label: 'instruction followed, outcome wrong', fix: 'The rule is wrong. Change the rule.' },
  'model-capability': { label: 'model capability', fix: 'Not an instruction problem — record a model floor for that role\'s tier.' },
  environment: { label: 'environment', fix: 'Not a finding.' },
};

/**
 * @param cells [{ label, ctx, trace, oracle, probes, board, ruleIndex }]
 *   ruleIndex: [{ file, rule, appliesToRole, matcher(defect) }] — the mapping from a
 *   defect to the instruction that governs it. Scenario- and fixture-supplied, because
 *   only the fixture's ground truth knows which rule a given defect was under.
 */
export function attribute(cells) {
  const defects = [];

  for (const c of cells) {
    for (const p of c.probes.filter((x) => x.status === 'fail')) {
      defects.push(classify(c, { kind: 'probe', id: p.id, title: p.title, rule: p.rule, role: roleForProbe(p) }));
    }
    if (c.oracle?.available) {
      for (const e of [...c.oracle.experience, ...c.oracle.acceptance].filter((x) => !(x.passed ?? x.satisfied))) {
        defects.push(classify(c, { kind: 'oracle', id: e.id, title: e.statement || e.id, story: e.story, rule: e.rule || null, role: e.role || 'worker' }));
      }
    }
    for (const e of c.board.escalations) {
      defects.push(classify(c, { kind: 'escalation', id: 'escalation', title: e.reason || 'escalation', role: 'orchestrator' }));
    }
  }

  return defects;
}

function roleForProbe(p) {
  if (/EXP/.test(p.id)) return 'experience-runner';
  if (/TEST|MAIN/.test(p.id)) return 'worker';
  if (/SCOPE|SEC/.test(p.id)) return 'proxy';
  if (/DISP|ROLE/.test(p.id)) return 'orchestrator';
  return 'worker';
}

function classify(cell, defect) {
  const governing = (cell.ruleIndex || []).find((r) =>
    (r.probe && r.probe === defect.id) || (r.rule && defect.rule && defect.rule.includes(r.rule)));

  if (!governing) {
    return { ...defect, cell: cell.label, ctx: cell.ctx, cause: 'instruction-absent', file: null, confidence: 'low' };
  }

  // Mechanical: did the governing file ever enter this agent's context?
  const readByRole = cell.trace.systemReads().some((r) =>
    r.file === governing.file && (!defect.role || r.role === defect.role));

  if (!readByRole) {
    return { ...defect, cell: cell.label, ctx: cell.ctx, cause: 'instruction-unread', file: governing.file, confidence: 'high' };
  }
  return { ...defect, cell: cell.label, ctx: cell.ctx, cause: 'instruction-violated', file: governing.file, confidence: 'high' };
}

/**
 * The capability pass — run AFTER attribution, across the matrix. A defect present
 * only in the weaker cells is reclassified: it is evidence about the model, and
 * without this pass you would spend a week rewriting an instruction that was fine.
 */
export function reclassifyByCapability(defects, cellsByConfigStrength) {
  const byDefect = groupBy(defects, (d) => `${d.kind}|${d.id}|${d.title}`);
  for (const [, group] of byDefect) {
    const configs = new Set(group.map((d) => d.ctx.configId));
    const strong = cellsByConfigStrength.filter((c) => c.strength === 'strong').map((c) => c.id);
    const appearsInStrong = strong.some((id) => configs.has(id));
    if (!appearsInStrong && strong.length && configs.size) {
      for (const d of group) { d.cause = 'model-capability'; d.confidence = 'high'; }
    }
  }
  return defects;
}

const SEVERITY = { probe: 3, oracle: 3, escalation: 1 };

/**
 * The fix list — ranked by frequency × severity × confidence, grouped by target file,
 * and every entry carries the assertion that would catch a regression. This repo's own
 * rule is that every instruction fix ships with the check that would have caught it,
 * and a fix list that ignores that rule generates exactly the drift the audit found.
 */
export function fixList(defects, { assertions = {} } = {}) {
  const groups = groupBy(defects, (d) => `${d.cause}|${d.file || 'none'}|${d.title}`);
  const conf = { high: 1, low: 0.5 };
  const rows = [...groups.values()].map((g) => {
    const d = g[0];
    const configs = new Set(g.map((x) => x.cell));
    const score = g.length * (SEVERITY[d.kind] || 1) * (conf[d.confidence] || 0.5);
    return {
      t: d.title,
      freq: `×${g.length} · ${configs.size} cell${configs.size === 1 ? '' : 's'}`,
      cause: CAUSES[d.cause]?.label || d.cause,
      causeKey: d.cause,
      target: d.file || 'none — no rule in any file covers this situation',
      ev: evidenceLine(g),
      fix: CAUSES[d.cause]?.fix || '',
      assert: assertions[d.id] || assertionFor(d),
      score: round(score, 2),
    };
  });
  return rows.sort((a, b) => b.score - a.score)
    .map((r, i) => ({ rank: i + 1, sev: r.score >= 9 ? 'high' : r.score >= 4 ? 'med' : 'low', ...r }));
}

function evidenceLine(group) {
  const kinds = groupBy(group, (d) => d.kind);
  return [...kinds.entries()].map(([k, v]) => `${v.length} ${k} failure${v.length === 1 ? '' : 's'}`).join(' · ');
}

function assertionFor(d) {
  switch (d.cause) {
    case 'instruction-unread':
      return 'verify-plugin.mjs: the rule\'s file is reachable from the role prompt or the phase guide that needs it';
    case 'instruction-violated':
      return 'verify-plugin.mjs: a mechanical check for this rule, so a violation fails before a live run';
    case 'instruction-absent':
      return 'verify-plugin.mjs: add the rule, then the assertion that the rule is present and cited';
    case 'model-capability':
      return 'none — record a tier-floor note in AGENTS/arbiter.md → Model Tier Policy';
    default:
      return 'none';
  }
}
