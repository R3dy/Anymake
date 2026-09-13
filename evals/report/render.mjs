// The report — §8.
//
// One self-contained HTML file per run, zero build step, no external fetches beyond
// the font: the same constraints dashboard/kanban.html works under, for the same
// reason (you will open this over file:// or a python3 -m http.server on a laptop,
// and it must just work). Data is inlined as a single JSON blob so the file can be
// emailed, archived and diffed.
//
// The machine-readable twin (report.json) carries the same data — that is what makes
// trend tracking, CI thresholds and cross-run analysis possible without scraping HTML.
import path from 'path';
import { HARNESS_ROOT, readText, writeText, writeJSON, round, median, iqr, overlaps, fmtDuration, groupBy } from '../lib/util.mjs';

const TEMPLATE = path.join(HARNESS_ROOT, 'report', 'template.html');

export function renderReport(runDir, model) {
  writeJSON(path.join(runDir, 'report.json'), model);
  const template = readText(TEMPLATE);
  if (!template) throw new Error(`report template missing at ${TEMPLATE}`);
  const html = template.replace('/*__RUN_DATA__*/{}', () => JSON.stringify(model));
  writeText(path.join(runDir, 'report.html'), html);
  return { html: path.join(runDir, 'report.html'), json: path.join(runDir, 'report.json') };
}

/**
 * Fold scored cells into the report model. One function, because every view has to
 * agree with every other one, and the way that stops being true is two code paths
 * computing "the composite" slightly differently.
 */
export function buildModel({ run, cells, diagnostics, baseline }) {
  const configs = buildConfigs(cells, run);
  const scenarios = buildScenarios(cells);
  const pillarLabels = ['Outcome', 'Fidelity', 'Conformance', 'Autonomy', 'Efficiency'];

  const model = {
    runId: run.id,
    startedAt: run.startedAt,
    synthetic: run.synthetic || false,
    syntheticNote: run.synthetic ? `Synthetic · adapter "${run.adapter}" — no agent was run, no measurement implied` : null,
    n: run.repeats,
    ablationN: run.ablationRepeats ?? null,
    staircaseScope: run.staircaseScope ?? null,
    weightsVersion: run.weightsVersion,
    provenance: provenance(run, cells),
    pillars: pillarLabels,
    configs,
    scenarios,
    matrix: buildMatrix(cells, scenarios, configs),
    probes: buildProbes(cells, configs),
    trust: buildTrust(cells, configs),
    trustStories: buildTrustStories(cells),
    gateRounds: buildGateRounds(cells, configs),
    autonomy: buildAutonomy(cells, configs),
    phases: diagnostics.phases || [],
    spend: buildSpend(cells, configs, diagnostics.phases || []),
    rework: buildRework(cells, configs),
    roles: buildRoles(cells),
    alarms: diagnostics.alarms || [],
    components: diagnostics.components || [],
    staircase: diagnostics.staircase || [],
    stages: diagnostics.stages || [],
    ceremony: diagnostics.overEngineering || null,
    files: diagnostics.instructions || [],
    fixes: diagnostics.fixes || [],
    trace: buildTrace(cells, run),
    cell: buildCellView(cells),
    notes: buildNotes(cells, configs, run),
    empty: emptyReasons(cells, diagnostics),
    baseline: baseline || null,
  };
  model.tiles = buildTiles(model, cells, diagnostics);
  return model;
}

/* ---------------- pieces ---------------- */

function provenance(run, cells) {
  const rows = [
    ['anymake', run.sha?.slice(0, 7) || 'working tree'],
    ['suite', run.suite],
    ['adapter', run.adapter],
    ['weights', run.weightsVersion],
    ['repeats', `n=${run.repeats}`],
    ['cells', String(cells.length)],
    ['simulator', run.simulatorModel ? `pinned · ${run.simulatorModel}` : 'script table only'],
    ['concurrency', `${run.concurrency} cells`],
    ['spend', `$${round(cells.reduce((a, c) => a + (c.usd || 0), 0), 2).toFixed(2)}`],
    ['wall-clock', fmtDuration(run.wallMs)],
  ];
  if (run.fixtures?.length) rows.splice(3, 0, ['fixtures', run.fixtures.join(' · ')]);
  return rows;
}

/**
 * The control arm is a scenario class (S0), but it reads as a leaderboard ROW: "same
 * brief, same model, plugin absent". Grouping it under the model config it shares with
 * the Anymake cells would hide the one comparison that makes every other number
 * interpretable, so it gets its own row.
 */
const configKey = (c) => (c.ctx.anymake ? c.ctx.configId : `${c.ctx.configId}::control`);

function buildConfigs(cells, run) {
  const byConfig = groupBy(cells, configKey);
  return [...byConfig.entries()].map(([id, group]) => {
    const composites = group.map((c) => c.composite).filter((x) => x != null);
    const g0 = group[0];
    const control = !g0.ctx.anymake;
    return {
      id,
      label: control ? `${g0.ctx.configLabel || g0.ctx.configId} — no Anymake` : (g0.ctx.configLabel || id),
      note: control ? 'control · same brief, same model, plugin absent' : (g0.ctx.configNote || ''),
      composite: round(median(composites), 1),
      iqr: iqr(composites),
      n: group.length,
      usd: round(median(group.map((c) => c.usd)) || 0, 2),
      pillars: ['A', 'B', 'C', 'D', 'E'].map((p) => round(median(group.map((c) => c.pillars?.[p]?.score)), 0)),
      mechanical: round(median(group.map((c) => c.mechanical)), 1),
      veto: g0.vetoes?.length ? g0.vetoes[0].label : (group.find((c) => c.vetoes?.length)?.vetoes[0]?.label ?? null),
      tierBind: g0.ctx.tiered ? round(median(group.map((c) => c.raws?.['EFF-07']?.value)), 2) : null,
      control,
    };
  });
}

function buildScenarios(cells) {
  const seen = new Map();
  for (const c of cells) {
    if (!seen.has(c.ctx.scenarioId)) {
      seen.set(c.ctx.scenarioId, { id: c.ctx.scenarioId, label: c.ctx.scenarioLabel, type: c.ctx.type });
    }
  }
  return [...seen.values()];
}

function buildMatrix(cells, scenarios, configs) {
  const m = {};
  for (const s of scenarios) {
    m[s.id] = configs.map((cfg) => {
      const group = cells.filter((c) => c.ctx.scenarioId === s.id && configKey(c) === cfg.id);
      return group.length ? round(median(group.map((c) => c.composite)), 0) : null;
    });
  }
  return m;
}

function buildProbes(cells, configs) {
  const ids = new Map();
  for (const c of cells) for (const p of c.probes || []) if (!ids.has(p.id)) ids.set(p.id, p.title);
  return [...ids.entries()].map(([id, title]) => ({
    id, t: title,
    r: configs.map((cfg) => {
      const rs = cells.filter((c) => configKey(c) === cfg.id).flatMap((c) => (c.probes || []).filter((p) => p.id === id));
      if (!rs.length || rs.every((r) => r.status === 'nt')) return 'nt';
      return rs.some((r) => r.status === 'fail') ? 'fail' : 'pass';
    }),
  }));
}

function buildTrust(cells, configs) {
  return configs.map((cfg, i) => {
    const group = cells.filter((c) => configKey(c) === cfg.id);
    const ev = group.map((c) => c.raws?.['OUT-04']?.evidence).filter(Boolean);
    const claimed = Math.round(avg(ev.map((e) => e.claimed)));
    const verified = Math.round(avg(ev.map((e) => e.verified)));
    return { c: i, claimed: claimed || 0, verified: verified || 0 };
  });
}

function buildTrustStories(cells) {
  const out = [];
  for (const c of cells) {
    for (const s of c.raws?.['OUT-04']?.evidence?.gapStories || []) {
      out.push({ c: c.ctx.configLabel || c.ctx.configId, story: `${s.id} — ${s.title}`, why: s.why });
    }
  }
  return out.slice(0, 40);
}

function buildGateRounds(cells, configs) {
  return configs.map((cfg, i) => {
    const group = cells.filter((c) => configKey(c) === cfg.id);
    const buckets = [0, 0, 0];
    for (const c of group) {
      for (const [, rounds] of groupBy(c.gateDecisions || [], (g) => g.gate)) {
        const n = rounds.length;
        buckets[Math.min(2, n - 1)]++;
      }
    }
    return { c: i, r: buckets };
  }).filter((x) => x.r.some(Boolean));
}

function buildAutonomy(cells, configs) {
  return configs.map((cfg, i) => {
    const g = cells.filter((c) => configKey(c) === cfg.id);
    return {
      c: i,
      escal: Math.round(avg(g.map((c) => c.raws?.['AUT-06']?.value))) || 0,
      human: Math.round(avg(g.map((c) => c.raws?.['AUT-05']?.evidence?.scripted))) || 0,
      unscripted: Math.round(avg(g.map((c) => c.raws?.['AUT-05']?.evidence?.unscripted))) || 0,
      planRounds: round(avg(g.map((c) => c.raws?.['AUT-02']?.value ?? c.raws?.['AUT-01']?.value)), 1) || 0,
      longest: fmtDuration(avg(g.map((c) => (c.raws?.['AUT-07']?.value || 0) * 60000))),
    };
  });
}

function buildSpend(cells, configs, phases) {
  return configs.map((cfg, i) => {
    const g = cells.filter((c) => configKey(c) === cfg.id);
    return { c: i, v: phases.map((p) => round(avg(g.map((c) => c.raws?.['EFF-04']?.evidence?.byPhase?.[p] || 0)), 2) || 0) };
  }).filter((x) => x.v.some((n) => n > 0));
}

function buildRework(cells, configs) {
  return configs.map((cfg, i) => ({
    c: i,
    v: round(avg(cells.filter((c) => configKey(c) === cfg.id).map((c) => c.raws?.['EFF-06']?.value)), 2) || 0,
  }));
}

function buildRoles(cells) {
  const totals = new Map();
  let all = 0;
  for (const c of cells) {
    for (const [role, usd] of Object.entries(c.raws?.['EFF-04']?.evidence?.byRole || {})) {
      totals.set(role, (totals.get(role) || 0) + usd); all += usd;
    }
  }
  if (!all) return [];
  return [...totals.entries()].sort((a, b) => b[1] - a[1])
    .map(([r, usd]) => ({ r: pretty(r), pct: round(usd / all, 3) }));
}

const pretty = (r) => ({ 'experience-runner': 'Experience Runner', 'plan-reviewer': 'Plan Reviewer', proxy: 'Proxy / gates' }[r]
  || r.charAt(0).toUpperCase() + r.slice(1));

/** The dispatch tree for the focus cell, inline; the full record stays in traces/. */
function buildTrace(cells, run) {
  const focus = pickFocusCell(cells);
  if (!focus) return null;
  const spawns = focus.trace.spawns();
  return {
    cell: focus.label,
    cellId: focus.id,
    hasFullTraces: true,
    captured: focus.trace.captured,
    runs: spawns.slice(0, 40).map((s) => ({
      agent: s.agent, tier: s.tier, story: s.story, attempt: s.attempt,
      model: s.model_served || 'unknown', tin: s.tin, tout: s.tout,
      dur: fmtDuration(s.durationMs),
      out: s.artifact || s.verdict || '—',
      verdict: s.verdict || '',
      state: /FAIL|NEEDS CHANGES/i.test(s.verdict || '') ? 'fail' : (s.retry ? 'retry' : 'ok'),
      comp: focus.trace.composition(s).slice(0, 6),
      turns: s.turns.slice(0, 6).map((t) => ({
        reason: t.reasoning || null,
        tools: (t.tool_calls || []).map((tc) => [tc.name, tc.args || '', tc.result || '', tc.ms || 0]),
        files: (t.files_read || []).map((f) => [f.path, classify(f.path)]),
        msg: t.message || '',
      })),
    })),
  };
}

const classify = (p) => /AGENTS|TEMPLATES|PHASE_GUIDES|skills|PROJECT_TYPES/.test(p) ? 'sys'
  : /PROJECTS\//.test(p) ? 'proj' : 'src';

function pickFocusCell(cells) {
  // The cell you would actually open: the one with a trust gap, else the worst-scoring
  // non-control cell, else the first. A focus cell chosen at random wastes the view.
  return cells.find((c) => (c.raws?.['OUT-04']?.value || 0) > 0)
    || cells.filter((c) => c.ctx.anymake).sort((a, b) => (a.composite ?? 100) - (b.composite ?? 100))[0]
    || cells[0] || null;
}

function buildCellView(cells) {
  const focus = pickFocusCell(cells);
  if (!focus) return null;
  const rows = [];
  for (const p of Object.values(focus.pillars || {})) {
    for (const r of p.rows || []) {
      if (r.score == null) continue;
      rows.push([r.id, r.label, r.display ?? String(r.raw ?? '—'), r.normalizer, String(r.score),
        r.weight != null ? `${r.weight}%` : '—', r.contribution != null ? String(r.contribution) : '—']);
    }
  }
  return {
    id: focus.label,
    composite: focus.composite, mech: focus.mechanical, full: focus.compositeUncapped,
    usd: focus.usd, wall: fmtDuration(focus.wallMs), agent: fmtDuration(focus.agentMs),
    stories: focus.storyCount ?? 0, done: focus.doneCount ?? 0,
    verified: focus.raws?.['OUT-04']?.evidence?.verified ?? 0,
    timeline: (focus.timeline || []).map((t) => ({
      lab: t.label,
      segs: [[t.start, t.end, 'var(--ord-3)', `${t.label} — ${t.end - t.start} min`]],
    })),
    derivation: rows,
    artifacts: (focus.artifactSummary || []),
  };
}

function buildTiles(model, cells, diagnostics) {
  const tiles = [];
  const ranked = model.configs.filter((c) => c.composite != null && !c.control)
    .sort((a, b) => (b.composite / b.usd) - (a.composite / a.usd));
  const best = ranked[0];
  if (best) {
    tiles.push({ k: 'Best cost-adjusted', v: String(best.composite), small: '/ 100',
      d: `${best.label} at $${best.usd.toFixed(2)} — highest composite per dollar in this run` });
  }
  const control = model.configs.find((c) => c.control);
  const top = model.configs.filter((c) => !c.control && c.composite != null).sort((a, b) => b.composite - a.composite)[0];
  tiles.push(control && top
    ? { k: 'Anymake vs control', v: `${top.composite - control.composite > 0 ? '+' : ''}${round(top.composite - control.composite, 0)}`,
        d: `${top.label} ${top.composite} vs no-Anymake control ${control.composite}, same brief` }
    : { k: 'Anymake vs control', v: '—', d: 'No control arm (S0) in this run — the Anymake numbers have nothing to be marginal to.' });

  const gaps = model.trustStories.length;
  tiles.push({ k: 'Trust gap', v: String(gaps), small: gaps === 1 ? 'story' : 'stories', alarm: gaps > 0,
    d: gaps ? 'Marked done, then failed the hidden oracle — see the Trust gap view' : 'No claimed-done story failed the oracle in this run' });

  const probeFails = model.probes.reduce((a, p) => a + p.r.filter((x) => x === 'fail').length, 0);
  const probeLive = model.probes.reduce((a, p) => a + p.r.filter((x) => x !== 'nt').length, 0);
  tiles.push({ k: 'Invariants broken', v: String(probeFails), small: `/ ${probeLive}`, alarm: probeFails > 0,
    d: `${model.configs.filter((c) => c.veto).length} config(s) capped by veto` });

  if (model.ceremony?.process != null) {
    tiles.push({ k: 'Ceremony ratio', v: String(Math.round(model.ceremony.process * 100)), small: '% process',
      d: model.ceremony.readback != null ? `${Math.round(model.ceremony.readback * 100)}% of artifacts written were never read again — see Components` : 'process vs shipped-code token share' });
  }
  const comps = diagnostics.components || [];
  const weakest = comps.filter((c) => c.v === 'review' || c.v === 'negative')[0];
  const measured = comps.filter((c) => c.arms > 0);
  tiles.push(weakest
    ? { k: 'Weakest component', v: weakest.n.split('·')[0].trim(), alarm: true, d: weakest.note }
    : measured.length
      ? { k: 'Weakest component', v: 'none flagged',
          d: `${measured.length} component(s) ablated; none scored negative or review. ${comps.length - measured.length} still unmeasured.` }
      : { k: 'Weakest component', v: 'unmeasured',
          d: 'No ablation arms in this run — the component ledger has a cost side only. Run --suite ablation or --suite staircase.' });
  return tiles;
}

function buildNotes(cells, configs, run) {
  const notes = {};
  const ranked = configs.filter((c) => c.composite != null).sort((a, b) => b.composite - a.composite);
  if (ranked.length >= 2 && overlaps(ranked[0].iqr, ranked[1].iqr)) {
    notes.leaderboard = `${ranked[0].label} and ${ranked[1].label} are <b>not separated at n=${run.repeats}</b> — `
      + `their IQRs overlap (${ranked[0].iqr.join('–')} vs ${ranked[1].iqr.join('–')}). Order them at your own risk; `
      + `a cost difference at the same quality is the separable claim.`;
  } else if (ranked.length >= 2) {
    notes.leaderboard = `${ranked[0].label} leads ${ranked[1].label} with non-overlapping IQRs at n=${run.repeats}. `
      + `This harness detects large differences, not two-point gaps — read the margin, not the order.`;
  }
  const vetoed = configs.filter((c) => c.veto);
  if (vetoed.length) {
    notes.probes = `${vetoed.map((c) => c.label).join(', ')} ${vetoed.length === 1 ? 'is' : 'are'} capped by veto: `
      + `${vetoed[0].veto}. That is a rule the system calls absolute, crossed — not a quality shortfall.`;
  }
  return notes;
}

function emptyReasons(cells, diagnostics) {
  return {
    components: diagnostics.components?.length ? null : 'No ablation arms were run, so the component ledger has no benefit side. Run --suite ablation or --suite staircase.',
    traces: 'No trace turns were captured — check the adapter probe (node evals/run.mjs --probe).',
    instructions: 'No system-file reads were captured, so instruction attention cannot be computed.',
    fixes: 'No defects were attributed in this run.',
    probes: 'No probe was triggered: this suite has no probe schedule and no passive probe found evidence.',
    trust: 'No cell reported claimed-done stories against an oracle.',
    cell: 'No scoreable cell in this run.',
  };
}

const avg = (xs) => { const v = xs.filter((x) => Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
