// Checking-stage yield — §7.5.
//
// Anymake has four checking stages, and each was added on a specific argument about
// what the previous one could not catch. Those arguments are testable, and exactly
// one column settles them: **unique catches** — defects no other stage caught and the
// oracle confirms.
//
// This is the number that keeps or kills the Experience Runner. Zero unique catches
// across a sweep, against a launch-and-drive cycle per story, is the strongest
// possible argument to cut it. Nonzero, and every one is an instance of the exact
// failure the system was built to prevent.
import { round, sum } from '../lib/util.mjs';

const STAGES = [
  { key: 'validator', label: 'Validator', roles: ['validator'] },
  { key: 'experience-runner', label: 'Experience Runner', roles: ['experience-runner'] },
  { key: 'proxy', label: 'Product Owner Proxy', roles: ['proxy'] },
  { key: 'plan-reviewer', label: 'Plan Reviewer', roles: ['plan-reviewer'] },
];

const isRejection = (v) => /FAIL|NEEDS CHANGES|REJECT|BLOCKED/i.test(v || '');

export function stageYield(cells) {
  const rows = [];
  for (const st of STAGES) {
    let inv = 0, usd = 0, catches = 0, unique = 0, falsePos = 0, misses = 0;
    const evidence = [];

    for (const c of cells) {
      const spawns = c.trace.spawns().filter((s) => st.roles.includes(s.role));
      inv += spawns.length;
      usd += sum(spawns.map((s) => s.usd));

      const rejections = spawns.filter((s) => isRejection(s.verdict));
      for (const r of rejections) {
        const real = oracleConfirms(c, r.story);
        if (real === true) {
          catches++;
          if (!caughtElsewhere(c, r.story, st.key)) { unique++; evidence.push({ cell: c.label, story: r.story, stage: st.label }); }
        } else if (real === false) {
          // The oracle says the work was fine. This rejection cost a rework cycle
          // and bought nothing — the harm column of §7.3.
          falsePos++;
        }
      }

      // A miss: this stage passed a story the oracle later failed.
      for (const s of spawns.filter((x) => !isRejection(x.verdict) && x.verdict)) {
        if (oracleFails(c, s.story)) misses++;
      }
    }

    rows.push({
      s: st.label, key: st.key, inv, usd: round(usd, 2),
      catch: catches, uniq: unique, fp: falsePos, miss: misses,
      costPerUnique: unique ? round(usd / unique, 2) : null,
      evidence: evidence.slice(0, 12),
      // §7.9's redundancy index, per stage: how much of what it caught someone else also caught.
      redundancy: catches ? round((catches - unique) / catches, 2) : null,
    });
  }
  return rows;
}

/** Did the oracle later show this story was genuinely broken at the time of rejection? */
function oracleConfirms(cell, story) {
  if (!cell.oracle?.available || story == null) return null;
  const entries = [...cell.oracle.experience, ...cell.oracle.acceptance].filter((e) => String(e.story) === String(story));
  if (!entries.length) return null;
  // A story that ends up passing after the rework is the normal shape of a real catch:
  // the rejection is what produced the fix. A story that never had a defect the oracle
  // can see, and passed on the first attempt anyway, is a false rejection.
  return entries.some((e) => e.defectAtRejection === true) ? true
    : entries.every((e) => (e.passed ?? e.satisfied) && e.attempts === 1) ? false : null;
}

function oracleFails(cell, story) {
  if (!cell.oracle?.available || story == null) return false;
  return [...cell.oracle.experience, ...cell.oracle.acceptance]
    .some((e) => String(e.story) === String(story) && !(e.passed ?? e.satisfied));
}

function caughtElsewhere(cell, story, exceptStage) {
  return cell.trace.spawns().some((s) =>
    String(s.story) === String(story) && s.role !== exceptStage && isRejection(s.verdict));
}

export { STAGES };
