# Hobby / Personal Project — Build Guide

> **`project_type: hobby`** — for projects whose endpoint is "it runs locally and I use or enjoy it." The goal is momentum and a working thing, not a business. This guide deliberately strips the heavy machinery (market research, monetization, launch/legal/metrics) and keeps just enough structure to avoid the two failure modes: building without any plan, and planning forever without building.

**The whole point:** finish something that works. When in doubt, choose the smaller scope and the faster path to "it runs."

---

## Phase 0 — Foundation (lite)

One short session. Produce `PROJECTS/[name]/PROJECT.md` with just:

- **Name** — what you're calling it
- **What it does** — one or two sentences, describing the experience
- **Why** — why it's worth building (a personal need, learning goal, or it's just fun)
- **Scope** — a short "in scope" list and an explicit "not doing" list. Err small.
- **Done looks like** — the one concrete thing that, once it works, means the project succeeded (e.g., "I can drop in a CSV and get a chart open in my browser")

Skip: revenue model, success/business metrics, market positioning, team.

**Gate:** You glance at it and say "yep." In autonomous mode the proxy only checks that scope and "done looks like" are filled in.

---

## Phase 1 — Discovery (optional, skip by default)

Usually skipped. Spend time here only if it helps *you*:

- A quick note on **prior art / inspiration** — existing things that do something similar, and what you want to do differently. A few bullet points, not a competitor table.
- Any **unknowns** worth a 10-minute look before committing (e.g., "does library X actually do Y?").

No market sizing, no personas, no risk register. Move on quickly.

---

## Phase 2 — Planning (lite)

Produce a lightweight plan. One file, `docs/plan.md`, is plenty.

- **Feature list** — the handful of things it needs to do, roughly ordered. Informal acceptance notes are fine ("clicking export downloads a .png").
- **UX** — only if it has screens. A rough sketch or a sentence per screen. No design system, no prototype gate. If it's a script, skip entirely.
- **Stack & approach** — pick your tools and write one line on why. Favor what's fastest and most enjoyable for you. Persistence? SQLite or a flat file unless you need more.
- **Monetization** — none. Skip entirely.

**Gate:** You're happy the plan is buildable. Proxy checks only that there's a feature list and a chosen stack.

---

## Phase 3 — Solutioning (lite)

Turn the plan into a simple checklist backlog in `docs/backlog.md`:

- A flat, ordered list of buildable tasks. Group under informal headings if helpful.
- No formal epics, no story template, no dependency graph required — just order the tasks so each builds on the last.
- Put the "done looks like" milestone near the top of mind: order tasks toward making *that* work first.

**Gate:** The list is concrete enough to start building. Proxy checks the backlog is non-empty and ordered.

---

## Phase 4 — Implementation (lite)

Build it and run it locally.

- **Build order** adapts to shape. For a small local app: `Data/State → Core logic → Interface (UI or CLI) → Tests (optional)`. Skip any layer that doesn't apply.
- **Run locally** — the success bar is "it runs on my machine and does the thing." `npm run dev`, `python main.py`, etc.
- **CI/CD and staging are optional.** Set them up only if you want them.
- **Tests are encouraged, not required.** Add a test where it saves you debugging pain or guards something fragile. A missing test suite does not block this phase.
- **Commits** — commit as you go; conventional-commit format is nice but not enforced here.
- **The agentic build loop is optional.** For most hobby projects, just build it directly in the session. Use the orchestrator/worker/validator system only for a larger hobby project where you want the automation.

**Gate:** It runs and does what "done looks like" described. Proxy checks that the project builds/runs and that no secrets are committed if it touches credentials.

---

## Phase 5 — Use It (replaces Launch)

There is no public launch.

- **Use it.** That was the point.
- **Optionally share it** — push to a personal repo, send it to a friend, write a short README so future-you remembers how to run it.
- **Optionally keep going** — if it grows into something you want to ship for real, switch `project_type` to `saas` (or `cli`/`library`) and pick up the heavier phases from there. The work so far carries over.

No metrics dashboard, no monitoring, no legal pages.

---

## What's intentionally missing (and why)

| Skipped | Why it's fine to skip for a hobby project |
|---------|-------------------------------------------|
| Market research, competitors, TAM | You're not selling it; you already know if *you* want it |
| Monetization | No revenue model by definition |
| Mandatory prototype gate | Polish is optional when you're the only user |
| Mandatory tests / CI | Speed and momentum matter more; add them where they earn their keep |
| Launch, legal, analytics | Nothing is being shipped to the public |

If any of these start to matter, that's a signal the project has outgrown `hobby` — switch types and the fuller phases kick in.
