---
name: bmad-builder
description: Use when Royce wants to build a SaaS product from scratch — planning, designing, and implementing with structured phase gates. Triggers on "start a new project", "continue my build", "plan a product", "build an app", "BMad", "agentic build", "structured build process", or when working on LLM Geek or any new product development. Guides through Foundation → Discovery → Planning → Solutioning → Implementation → Launch with Royce approval at each phase gate.
---

# BMad Builder — Agentic SaaS Build System

**Purpose:** Guide the complete planning and build of any SaaS product from idea to production using structured AI-assisted development.  
**Method:** BMad (Business-model Artificial intelligence Developer) — phased approach with checkpoint gates  
**Users:** Royce (product owner) + Operant (AI operator)  
**Token budget:** 10,000 tokens per session

**Note:** No time estimates. This system is for AI agent execution, not human sprint tracking. Human time estimates are irrelevant when Operant is doing the building.

## Core Philosophy

BMad is not about prompting. It's a structured development system where:
- **Royce** owns the vision, makes decisions, approves phases
- **Operant** executes, plans, researches, builds — within approved scope
- **Checkpoints** gate every phase transition — no skipping ahead
- **Artifacts** are the source of truth — not memory or conversation

The system prevents the two biggest failure modes:
1. **Building without planning** → scope creep, rewrites, dead ends
2. **Planning without building** → analysis paralysis, no output

## Phase Overview

| Phase | Name | Gate | Output |
|-------|------|------|--------|
| 0 | Foundation | Royce start signal | Project defined in `PROJECT.md` |
| 1 | Discovery | Royce approval | `docs/01-discovery.md` |
| 2 | Planning | Royce approval | `docs/02-planning/` (PRD, UX, Architecture) |
| 3 | Solutioning | Royce approval | `docs/03-solutioning/` (Epics, Stories, Backlog) |
| 4 | Implementation | Royce approval | `src/` (production code) |
| 5 | Launch | Royce approval | Live product, metrics |

## Session Format

Every session:
1. Check `PHASE_STATE.md` — where are we?
2. Identify current step in current phase
3. Execute one step (not a phase — one step)
4. Produce concrete artifact or decision
5. Report and wait for approval

**Note:** No time estimates. Operant is an AI coding agent — tracking human time is irrelevant.

## How to Start

Royce says: **"Start a new project"** or **"Continue [project name]"**

- **New project:** I create `PROJECT.md` in a new workspace, begin Phase 0
- **Continue:** I read `PHASE_STATE.md` and pick up where we left off

## What BMad Is Not

- Not a code generator — it's a structured build methodology
- Not a consultant replacement — Royce makes business decisions
- Not a one-shot prompt — it's a multi-session system
- Not a framework — it's a process with tools

## Key Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This file — system overview |
| `PHASE_GUIDES/` | Detailed guides for each phase (0-5) |
| `TEMPLATES/` | Document templates for all artifacts |
| `PROJECTS/` | Project workspaces (one per project) |

## Key Principles

1. **One artifact at a time** — don't produce multiple documents simultaneously
2. **Decisions over suggestions** — I must make recommendations, not just list options
3. **Scope is a gate, not a suggestion** — nothing gets built outside approved scope
4. **Clean exits** — each session ends with a clear "next step" documented
5. **No ghost commits** — if I push code, it's been reviewed or it's scaffold

## Anti-Patterns

- Building without a signed-off PRD
- Adding features mid-phase
- Skipping UX when the product has user-facing screens
- Implementing features that aren't in the approved backlog
- Pushing code without Royce's review on first few PRs

## BMad Method Context

BMad (Business-model Artificial intelligence Developer) is a structured AI-assisted development method. The key insight: **AI agents working without structured process produce messy, unplanned output.** The method imposes phase gates so that:

- Every build decision is intentional
- Every phase output is reviewed before proceeding
- The product owner (Royce) maintains control throughout

Reference: context7.com/bmad-code-org/bmad-method — "Structured AI-assisted development for production software"

## Available Phases

| Phase | Guide | Template |
|-------|-------|----------|
| Phase 0: Foundation | `PHASE_GUIDES/phase-0.md` | `TEMPLATES/project.md` |
| Phase 1: Discovery | `PHASE_GUIDES/phase-1.md` | `TEMPLATES/discovery.md` |
| Phase 2: Planning | `PHASE_GUIDES/phase-2.md` | `TEMPLATES/prd.md`, `TEMPLATES/adr.md` |
| Phase 3: Solutioning | `PHASE_GUIDES/phase-3.md` | `TEMPLATES/epic.md`, `TEMPLATES/story.md` |
| Phase 4: Implementation | `PHASE_GUIDES/phase-4.md` | — |
| Phase 5: Launch | `PHASE_GUIDES/phase-5.md` | — |

---

*BMad Builder skill suite — v1.0 — For use with Royce + Operant*