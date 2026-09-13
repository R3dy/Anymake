// Normalizers — §6.1 of docs/design/eval-harness.md.
//
// Every raw metric becomes 0–100 through one *declared* normalizer. The rule the
// design states and this file enforces: no metric gets an ad-hoc formula in code.
// If you need a new shape, add it here and name it in the catalog — never inline
// arithmetic at the call site.
import { round } from '../lib/util.mjs';

const clamp = (n) => Math.max(0, Math.min(100, n));

export const NORMALIZERS = {
  /** 100 × value, for pass rates and coverage ratios. */
  ratio: (v) => (v == null ? null : clamp(100 * v)),

  /** 100 × (1 − value), for trust gap, regressions, waiver abuse. */
  'inverted rate': (v) => (v == null ? null : clamp(100 * (1 - v))),
  inverted: (v) => (v == null ? null : clamp(100 * (1 - v))),

  /** 0 or 100 — buildability, test integrity. */
  binary: (v) => (v == null ? null : v ? 100 : 0),

  /**
   * band(target, tolerance, zero_at): 100 inside [target-tolerance, target+tolerance],
   * decaying linearly to 0 at zero_at. zero_at may sit on either side of target, so
   * this covers both "smaller is better" (cost) and "closer to 1 is better" (gate rounds).
   */
  band: (v, { target, tolerance = 0, zero_at }) => {
    if (v == null || target == null) return null;
    const d = Math.abs(v - target);
    if (d <= tolerance) return 100;
    if (zero_at == null) return null; // uncalibrated: report raw, do not guess (§6.1)
    const span = Math.abs(zero_at - target) - tolerance;
    if (span <= 0) return 0;
    return clamp(100 * (1 - (d - tolerance) / span));
  },

  /** 100 × (1 − min(1, hits/cap)) — placeholders, tooling improvisation. */
  'inverted density': (v, { cap = 10 } = {}) =>
    (v == null ? null : clamp(100 * (1 - Math.min(1, v / cap)))),

  /** 25 × score, for judged 0–4 rubrics. */
  rubric: (v) => (v == null ? null : clamp(25 * v)),

  /** Explicit map — terminal outcome and friends. */
  categorical: (v, { map = {} } = {}) => (v == null ? null : map[v] ?? null),
};

/**
 * Apply a metric's declared normalizer to a raw value.
 * Returns { score, note } — `note` explains a null so the report can say
 * "unscored" with a reason instead of defaulting to a number (§3.7, §6.1).
 */
export function normalize(metric, raw, opts = {}) {
  const fn = NORMALIZERS[metric.normalizer];
  if (!fn) return { score: null, note: `unknown normalizer '${metric.normalizer}'` };
  if (raw == null) return { score: null, note: 'no value collected' };
  const params = { ...(metric.params || {}), ...opts };
  if (metric.normalizer === 'band' && params.zero_at == null) {
    return { score: null, note: 'uncalibrated band — reported raw, excluded from the composite' };
  }
  const score = fn(raw, params);
  return { score: score == null ? null : round(score, 1), note: null };
}
