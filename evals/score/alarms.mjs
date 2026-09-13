// Derived alarms — §6.7.
//
// These are relationships between metrics, not metrics. They are diagnoses, and a
// diagnosis should not be silently averaged into a grade — so they are surfaced as
// named flags and never enter the composite.
//
// Each alarm declares the metric pair it reads and the sentence it prints, so the
// report can always show *why* it fired rather than just that it did.
const v = (raws, id) => raws[id]?.value ?? null;
const norm = (cell, id) => cell.metricScores?.[id] ?? null;

export const ALARMS = [
  {
    id: 'rubber-stamp', sev: 'crit', name: 'Rubber-stamp',
    means: 'The gate approved weak artifacts. The proxy is lenient, not the work good.',
    fire: (c) => {
      const rounds = v(c.raws, 'AUT-01');
      const placeholders = v(c.raws, 'FID-07');
      const completeness = v(c.raws, 'CNF-06');
      if (rounds == null) return null;
      const lenient = rounds <= 1.05;
      const weak = (placeholders != null && placeholders >= 8) || (completeness != null && completeness < 0.8);
      if (!(lenient && weak)) return null;
      return `Gate rejection rate is the lowest measurable (${rounds.toFixed(2)} mean rounds to approval) while `
        + (placeholders >= 8 ? `placeholder density is ${placeholders} hits` : `artifact completeness is ${Math.round(completeness * 100)}%`)
        + '. The gate is lenient, not the work clean.';
    },
  },
  {
    id: 'trust-gap', sev: 'crit', name: 'Trust gap',
    means: 'The system said done about something that is not. The core failure mode, live.',
    fire: (c) => {
      const gap = v(c.raws, 'OUT-04');
      if (!gap) return null;
      const n = c.raws['OUT-04']?.evidence?.gapStories?.length ?? 0;
      const claimed = c.raws['OUT-04']?.evidence?.claimed ?? '?';
      return `${n} of ${claimed} stories merged autonomously fail the hidden oracle.`;
    },
  },
  {
    id: 'waiver-abuse', sev: 'warn', name: 'Waiver abuse',
    means: 'Experience gate bypassed by declaring user-observable behavior unobservable.',
    fire: (c) => {
      const abuse = v(c.raws, 'CNF-05');
      if (!abuse) return null;
      const ev = c.raws['CNF-05']?.evidence || {};
      return `${ev.abused ?? '?'} stories declared §3a: N/A for behavior the experience probe shows is user-observable.`;
    },
  },
  {
    id: 'thrash', sev: 'warn', name: 'Thrash',
    means: 'Got there, burned a fortune doing it.',
    fire: (c) => {
      const rework = v(c.raws, 'EFF-06');
      const completion = v(c.raws, 'OUT-01');
      if (rework == null || rework < 0.25) return null;
      if (completion != null && completion < 0.7) return null; // that is failure, not thrash
      return `${Math.round(rework * 100)}% of spend went to retries and re-plans while completion stayed normal.`;
    },
  },
  {
    id: 'tier-illusion', sev: 'crit', name: 'Tier illusion',
    means: 'Tier binding silently fell back; this cell is not testing what it claims to.',
    fire: (c) => {
      if (!c.ctx.tiered) return null;
      const bind = v(c.raws, 'EFF-07');
      if (bind == null || bind >= 0.6) return null;
      return `Only ${Math.round(bind * 100)}% of sub-agent turns ran on their tier's model. `
        + 'Attributing this cell\'s result to tiering would be wrong.';
    },
  },
  {
    id: 'planning-drift', sev: 'warn', name: 'Planning drift',
    means: 'Built its plan faithfully; the plan was not the ask.',
    fire: (c) => {
      const p = norm(c, 'FID-01'), b = norm(c, 'FID-02');
      if (p == null || b == null || !(p < 60 && b > 75)) return null;
      return `FID-01 ${Math.round(p)} / FID-02 ${Math.round(b)} — built its plan faithfully; the plan missed part of the brief.`;
    },
  },
  {
    id: 'execution-drift', sev: 'warn', name: 'Execution drift',
    means: 'Planned well, built something else.',
    fire: (c) => {
      const p = norm(c, 'FID-01'), b = norm(c, 'FID-02');
      if (p == null || b == null || !(p > 75 && b < 60)) return null;
      return `FID-01 ${Math.round(p)} / FID-02 ${Math.round(b)} — the plan matched the brief; the code did not match the plan.`;
    },
  },
];

/** @returns [{ id, sev, name, who, text, means }] */
export function deriveAlarms(cells) {
  const out = [];
  for (const c of cells) {
    for (const a of ALARMS) {
      let text = null;
      try { text = a.fire(c); } catch { text = null; }
      if (text) out.push({ id: a.id, sev: a.sev, name: a.name, who: c.label, text, means: a.means });
    }
  }
  const rank = { crit: 0, warn: 1 };
  return out.sort((x, y) => (rank[x.sev] - rank[y.sev]) || x.name.localeCompare(y.name));
}
