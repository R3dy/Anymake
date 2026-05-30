# Project Type: Hobby / Personal (`hobby`)

## Identity
- **id:** `hobby`
- **One-liner:** A personal project whose endpoint is "it runs locally and I use or enjoy it" — no business attached.
- **Choose this when:** You're building for yourself or for fun, learning, or a single concrete personal need. Shipping to the public, charging money, and growth are explicitly not goals.
- **Not this if:** You intend to charge money or grow it (`saas`), or it's primarily a reusable package (`library`) or terminal tool (`cli`) — though a hobby project *can* be any shape; pick `hobby` when ambition, not shape, is the defining trait.

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (lite) | Name, what it does, why it's worth building, rough scope. No revenue. |
| 1 Discovery | skipped (optional) | Optionally a quick "prior art / inspiration" note. No market sizing or competitor tables. |
| 2 Planning | active (lite) | Lightweight PRD; UX only if it has screens; pick a stack; **no monetization**. |
| 3 Solutioning | active (lite) | A simple checklist backlog — no formal epics/dependency graph required. |
| 4 Implementation | active (lite) | Build it, run it locally. CI/CD and staging optional. Tests encouraged, not gated. |
| 5 Launch | replaced | "Use it / optionally share it." No legal, analytics, or public-launch machinery. |

## Success Model
**Personal use is first-class.** Success = it runs, it does the thing you wanted, and you'd use it again. No revenue or adoption metrics.

## Default Stack
Whatever is fastest and most enjoyable for you. Sensible defaults: a single-process app in your preferred language; SQLite or a flat file if it needs persistence; local-only, no auth unless the project is inherently multi-user.

## ADRs
- **Mandatory:** none. One short "Stack & Approach" note is enough.
- **Optional:** record a decision only if you're genuinely torn and want to remember why.

## Phase 2 Tracks
- **PRD:** yes (lite — a short feature list with informal acceptance notes)
- **UX + Prototype:** only if it has user-facing screens, and then lightweight; no hard visual gate
- **Architecture:** lite — pick a stack, note it, move on
- **Monetization:** no

## Phase 4 Build Order
Adapts to shape. Default for a small local app: `Data/State → Core logic → Interface (UI or CLI) → Tests (optional)`. Skip layers that don't apply.

## Launch & Metrics
Run locally (`npm run dev`, `python main.py`, etc.). Optionally push to a personal repo or share with friends. No metrics dashboard, no legal pages, no monitoring required.

## Gate Criteria Deltas
- **Skip:** all monetization checks (pricing, upgrade trigger, monetization milestone), the mandatory-prototype gate, market-size/competitor checks, GDPR/legal, AARRR metrics, mandatory ADR set.
- **Relax:** the automated-test mandate — tests are recommended but a gate must not fail solely for missing tests.
- **Keep:** scope clarity (Phase 0), "it actually runs" as the Phase 4 bar, no-secrets-in-code if the project touches credentials.
