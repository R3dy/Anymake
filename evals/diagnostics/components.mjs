// The component ledger and the ablation arms — §7.3, §7.4, §7.10.
//
// Anymake is not one thing; it is roughly fifteen separable bets. The cost side comes
// free with every run. The benefit side needs an ablation arm. The verdict needs both,
// and `unmeasured` is a first-class state — shown as such, never rounded to neutral.
//
// Two limits are enforced here rather than left to the reader:
//   · at n=2 a few composite points is noise, so a small delta is labeled, not ranked;
//   · insurance is not measured by its average payout. The security override, the
//     Never Building gate and the intent-conflict gate exist for rare, expensive
//     events; they are EXEMPT from the `negative` verdict and get a cost-of-insurance
//     line instead.
import { round, median, sum } from '../lib/util.mjs';

export const COMPONENTS = [
  { key: 'phase01', n: 'Phase 0–1 · Foundation + Discovery', abl: 'no-phase01', roles: ['orchestrator'], phases: [0, 1] },
  { key: 'design-system', n: 'Phase 2 · design system + prototype gate', abl: 'no-design-system', skills: ['anymake-design-system'] },
  { key: 'planner', n: 'Planner stage', abl: 'orchestrator-authors-briefs', roles: ['planner'] },
  { key: 'validator', n: 'Validator stage', abl: 'no-validator', roles: ['validator'] },
  { key: 'experience-runner', n: 'Experience Runner stage', abl: 'no-experience-runner', roles: ['experience-runner'] },
  { key: 'proxy', n: 'Product Owner Proxy gates', abl: 'auto-advance-gates', roles: ['proxy'] },
  { key: 'experience-scripts', n: 'Experience Scripts (Phase 3.2b)', abl: 'no-experience-scripts' },
  { key: 'intent-layer', n: 'Intent layer (Cartographer + DECISIONS/INVARIANTS)', abl: 'no-intent-layer', roles: ['cartographer'] },
  { key: 'plan-review', n: 'Plan Reviewer loop', abl: 'no-plan-review', roles: ['plan-reviewer'] },
  { key: 'dispatch-hardening', n: 'Dispatch hardening (INV-018)', abl: 'raw-dispatch' },
  { key: 'worktrees', n: 'Worktrees + concurrency', abl: 'sequential-shared-checkout' },
  { key: 'tiering', n: 'Model tiering', abl: null, note: 'covered by the matrix' },
  { key: 'conventions', n: 'CONVENTIONS.md accumulation', abl: 'no-conventions' },
  { key: 'board', n: 'Board-state + BOARD.md rendering', abl: 'no-board' },
  { key: 'brownfield', n: 'Brownfield mapping depth', abl: 'brownfield-lite' },
  { key: 'insurance', n: 'Security override + Never Building gate', abl: null, insurance: true },
];

const INSURANCE = new Set(['insurance']);
const NOISE_FLOOR = 5;   // composite points; below this at small n, say "inside noise"

/**
 * @param full        cells of the complete system (the baseline arm)
 * @param ablations   { [ablationId]: { cells, assertionHeld, n } }
 * @param stages      output of diagnostics/stages.mjs — supplies the harm column
 */
export function componentLedger({ full, ablations = {}, stages = [] }) {
  const baseComposite = median(full.map((c) => c.composite));
  const baseUsd = median(full.map((c) => c.usd)) || 0;
  const totalUsd = baseUsd || 1;
  const stageBy = Object.fromEntries(stages.map((s) => [s.key, s]));

  return COMPONENTS.map((comp) => {
    const cost = costOf(full, comp);
    const arm = comp.abl ? ablations[comp.abl] : null;
    const stage = stageBy[comp.key];
    const harm = stage ? stage.fp : 0;

    let delta = null, n = arm?.n ?? 0, discarded = false;
    if (arm) {
      if (arm.assertionHeld === false) {
        // An ablation whose trace assertion failed is DISCARDED, not scored — otherwise
        // you are measuring a patch that did not apply (§7.4).
        discarded = true;
      } else {
        const ablComposite = median(arm.cells.map((c) => c.composite));
        if (ablComposite != null && baseComposite != null) delta = round(ablComposite - baseComposite, 1);
      }
    }

    return {
      n: comp.n, key: comp.key, abl: comp.abl,
      pct: round(cost.usd / totalUsd, 3), usd: round(cost.usd, 2), tokens: cost.tokens,
      delta, harm, arms: n, discarded,
      insurance: !!comp.insurance,
      uniqueCatches: stage ? stage.uniq : null,
      v: verdict({ comp, delta, harm, n, discarded, stage }),
      note: noteFor({ comp, delta, harm, n, discarded, stage }),
    };
  });
}

function costOf(cells, comp) {
  let usd = 0, tokens = 0;
  for (const c of cells) {
    for (const s of c.trace.spawns()) {
      const roleHit = comp.roles?.includes(s.role);
      const phaseHit = comp.phases?.includes(s.turns[0]?.phase);
      if (roleHit || phaseHit) { usd += s.usd || 0; tokens += (s.tin || 0) + (s.tout || 0); }
    }
    if (comp.skills) {
      const invoked = c.trace.skillsInvoked();
      for (const s of comp.skills) if (invoked.get(s)) tokens += invoked.get(s) * 1000;
    }
  }
  return { usd: usd / Math.max(1, cells.length), tokens: Math.round(tokens / Math.max(1, cells.length)) };
}

function verdict({ comp, delta, harm, n, discarded, stage }) {
  if (comp.insurance) return 'insurance';
  if (discarded) return 'unmeasured';
  if (delta == null) return 'unmeasured';
  if (Math.abs(delta) < NOISE_FLOOR && n < 5) return 'inconclusive';
  if (delta < -NOISE_FLOOR) return 'earns its keep';
  if (delta > NOISE_FLOOR) return 'negative';
  if (stage && stage.uniq === 0 && harm > 0) return 'review';
  return 'neutral';
}

function noteFor({ comp, delta, harm, n, discarded, stage }) {
  if (comp.insurance) return 'Cost of insurance. Exempt from a delete verdict — insurance is not judged on its average payout (§7.10).';
  if (discarded) return 'Ablation discarded: the trace assertion showed the component still ran, so the arm measured a patch that did not apply.';
  if (delta == null) return comp.abl ? 'Ablation arm not run this sweep.' : 'No ablation defined; cost side only.';
  const dir = delta < 0 ? 'dropped' : 'rose';
  const size = Math.abs(delta);
  const base = `Removing it ${dir} the composite by ${size} points at n=${n}.`;
  const catches = stage ? ` ${stage.uniq} unique catches, ${stage.fp} false rejections.` : '';
  const noise = size < NOISE_FLOOR && n < 5
    ? ' That is inside noise at this n — re-run at n≥5 before acting on it.' : '';
  return base + catches + noise;
}

/**
 * The staircase — §7.4. Each step's marginal Δ is the value of adding that layer on
 * top of everything before it, and the first arm is exactly the S0 control: a frontier
 * model, going solo, on the same brief.
 */
export const STAIRCASE = [
  { id: 'bare', l: 'bare model (control)', removes: ['planner', 'validator', 'experience-runner', 'proxy', 'phases'] },
  { id: 'phases', l: '+ phases 0–3', removes: ['planner', 'validator', 'experience-runner', 'proxy'] },
  { id: 'planner', l: '+ planner', removes: ['validator', 'experience-runner', 'proxy'] },
  { id: 'validator', l: '+ validator', removes: ['experience-runner', 'proxy'] },
  { id: 'experience', l: '+ experience runner', removes: ['proxy'] },
  { id: 'full', l: '+ proxy gates (full)', removes: [] },
];

export function staircase(armCells) {
  let prev = null;
  return STAIRCASE.map((step) => {
    const cells = armCells[step.id] || [];
    const c = median(cells.map((x) => x.composite));
    const usd = median(cells.map((x) => x.usd));
    const d = c != null && prev != null ? round(c - prev, 1) : null;
    if (c != null) prev = c;
    return { l: step.l, c: c == null ? null : round(c, 1), usd: round(usd, 2), d, n: cells.length };
  });
}

/** §7.9 — six derived numbers aimed squarely at over-engineering. None enter the composite. */
export function overEngineering(cells) {
  const ceremonies = cells.map((c) => c.trace.ceremony()).filter(Boolean);
  const readbacks = cells.map((c) => c.trace.readBack()).filter(Boolean);
  const gateYield = cells.map((c) => c.gateYield).filter((x) => x != null);
  const retryYield = cells.map((c) => c.retryYield).filter((x) => x != null);
  const ttfc = cells.map((c) => c.timeToFirstCodeMin).filter((x) => x != null);
  const redundancy = cells.map((c) => c.redundancyIndex).filter((x) => x != null);
  return {
    process: round(median(ceremonies.map((x) => x.process)), 3),
    code: round(median(ceremonies.map((x) => x.code)), 3),
    readback: round(median(readbacks.map((x) => x.rate)), 3),
    gateYield: gateYield.length ? round(median(gateYield), 2) : null,
    retryYield: retryYield.length ? round(median(retryYield), 2) : null,
    redundancy: redundancy.length ? round(median(redundancy), 2) : null,
    ttfc: ttfc.length ? `${Math.round(median(ttfc))} min` : null,
    neverReadArtifacts: readbacks.flatMap((r) => r.neverRead).slice(0, 20),
  };
}

export { sum };
