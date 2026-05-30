# Project Types

Anymake adapts its phases, questions, tasks, build order, and gate criteria to the **kind of thing you're building**. The default is a monetized SaaS web app, but the same phase-gated, artifact-driven discipline applies to a CLI tool, a library, a weekend hobby project, and more.

This directory holds one **profile** per supported project type. A profile is two files:

| File | Purpose | Read by |
|------|---------|---------|
| `manifest.md` | Structured, machine-readable profile — phase map, success model, stack, ADRs, build order, gate deltas. The single source of truth for *how this type differs*. | Orchestrator, Worker, Product Owner Proxy |
| `guide.md` | Self-contained, human-readable walkthrough of every phase tailored to this type. | The main agent at each session |

Profiles are **self-contained**: to build a project of a given type, you read that type's `guide.md` and consult its `manifest.md`. You do not need to cross-reference other types.

---

## Available Types

| `project_type` | Name | Choose when | Monetization | User-facing UI |
|----------------|------|-------------|--------------|----------------|
| `saas` | SaaS Web App | A commercial, hosted product with paying users | First-class | Yes |
| `hobby` | Hobby / Personal | A personal project whose endpoint is "it runs locally and I use/enjoy it" | None | Maybe |
| `cli` | CLI Tool / Script | A terminal program or automation script | Optional | No (terminal) |
| `library` | Library / Package / SDK | Code other developers import | Optional | No |
| `api-service` | API / Backend Service | A headless web service exposing endpoints | Optional (API keys) | No (or thin docs) |
| `internal-tool` | Internal Tool | A team / line-of-business app, not sold | Never | Yes |
| `static-site` | Static / Content Site | Marketing site, blog, docs, or portfolio | Optional | Yes |

> **Type is two axes.** *Shape* (web app, CLI, library, API…) and *ambition* (personal-local vs. production-commercial). `hobby` is mostly an ambition setting; the rest are mostly shapes. Pick the one that matches your intent; each ships with sensible defaults.

---

## Runtime Selection

The chosen type is recorded in `PROJECTS/[name]/PHASE_STATE.md` as `project_type: <id>` (alongside `autonomous_mode`). It is set once, when the project is created, and read at the start of every session.

**How it's chosen:**
- Inline flag: `"Start a new project --type=cli"`
- Asked at creation: if no type is given, the system asks one question — *"What kind of project is this?"* — lists the options above, and recommends `saas` if the idea clearly describes a commercial product.
- Default: `saas` if the user explicitly declines to choose.

**Session startup ritual gains one step** (see `SKILL.md`):
1. Read `PHASE_STATE.md` → note `project_type` and `autonomous_mode`
2. **Read `PROJECT_TYPES/<project_type>/manifest.md` and `guide.md`** — these govern this session
3. Proceed with the phase/step using the type's guide, not the generic SaaS assumptions

---

## Manifest Schema

Every `manifest.md` has these sections, in this order, so agents can parse them uniformly.

```
# Project Type: <Name> (`<id>`)

## Identity
- id, one-liner, choose-when, not-this-if

## Phase Map
Table: each phase → active (full) | active (lite) | skipped | replaced, with a note

## Success Model
The first-class success axis for this type (revenue / adoption / personal use / reliability …).
This replaces "Revenue is first-class" for non-commercial types.

## Default Stack
Recommended technologies.

## ADRs
Mandatory and optional architecture decisions for this type.

## Phase 2 Tracks
Which planning sub-tracks run: PRD, UX+Prototype, Architecture, Monetization — each yes/no/lite.

## Phase 4 Build Order
The ordered layer sequence Workers follow for this type. Overrides the SaaS default
(Schema → Migration → API → Component → Page → Integration → Test).

## Launch & Metrics
Distribution target and the metrics framework that matters for this type.

## Gate Criteria Deltas
Per-gate overrides for the Product Owner Proxy: which checks to add, skip, or replace,
relative to the default SaaS gate criteria in AGENTS/product-owner-proxy.md.
```

When a manifest says a check is **skipped**, the Product Owner Proxy must not fail a gate for it. When it says **replaced**, the proxy applies the replacement check instead.

---

## Adding a New Type

1. Create `PROJECT_TYPES/<id>/manifest.md` following the schema above.
2. Create `PROJECT_TYPES/<id>/guide.md` — a self-contained phase walkthrough (use `hobby/guide.md` as a structural model).
3. Add a row to the **Available Types** table above.
4. No changes to the orchestrator, worker, or proxy are needed — they read the manifest generically.
