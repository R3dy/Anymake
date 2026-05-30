# SaaS Web App — Build Guide

> **`project_type: saas`** — the reference type. SaaS is the fullest expression of Anymake: every phase, every sub-track, monetization and a visual prototype included.

For `saas`, the canonical, fully detailed phase instructions are the repository's base guides — they were written for this type:

| Phase | Detailed guide | Templates |
|-------|----------------|-----------|
| 0 Foundation | `PHASE_GUIDES/phase-0.md` | `TEMPLATES/project.md` |
| 1 Discovery | `PHASE_GUIDES/phase-1.md` | `TEMPLATES/discovery.md` |
| 2 Planning | `PHASE_GUIDES/phase-2.md` | `TEMPLATES/prd.md`, `ux-design.md`, `adr.md`, `monetization.md` |
| 3 Solutioning | `PHASE_GUIDES/phase-3.md` | `TEMPLATES/epic.md`, `story.md` |
| 4 Implementation | `PHASE_GUIDES/phase-4.md` | `AGENTS/` + `TEMPLATES/task-brief.md`, `BOARD.md`, `validation-report.md` |
| 5 Launch | `PHASE_GUIDES/phase-5.md` | `TEMPLATES/launch-checklist.md`, `metrics-dashboard.md` |

Follow those guides as written. The `saas` `manifest.md` confirms: all phases full, monetization required, prototype is a hard gate, build order `Schema → Migration → API → Component → Page → Integration → Test`, AARRR metrics at launch.

**Why this guide is a pointer, not a copy:** the base guides already *are* the SaaS guides. Duplicating ~1,000 lines here would create two sources of truth that drift. Every other type's `guide.md` is self-contained because it diverges from this baseline; `saas` *is* the baseline.

## Gate behavior
The default gate criteria in `AGENTS/product-owner-proxy.md` are the `saas` criteria. No deltas apply.
