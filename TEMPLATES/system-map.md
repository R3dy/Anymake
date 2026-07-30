# SYSTEM_MAP.md — Template

Copy to `PROJECTS/[name]/docs/SYSTEM_MAP.md`. This is the **as-built** map of the
product — the document a new engineer reads on day one to understand the system
end to end. It is maintained by the Cartographer (`AGENTS/cartographer.md`) and
refreshed at the end of every `anymake-agile` cycle.

It describes **what the code actually is**, not what was planned. Where reality
diverged from the Phase 2 ADRs, the map records reality and links the deviation
to the decision that explains it (or flags it as undocumented drift).

---

# [Project Name] — System Map

**Last mapped:** [date]
**Mapped by:** Cartographer
**Commit / state mapped:** [git SHA or "working tree at <date>"]
**project_type:** [id]

---

## 1. One-Paragraph Orientation

What this system is, who uses it, and the single most important thing a new
contributor must understand before changing anything. Three to five sentences.

---

## 2. Module Map

The major parts of the codebase and what each is responsible for. One row per
module/package/top-level area — not one row per file.

| Module / path | Responsibility | Key files | Depends on | Owner ADR(s) |
|---------------|----------------|-----------|------------|--------------|
| `src/[area]` | [what it does] | `[entry file]` | `[other module]` | ADR-00N |

---

## 3. Data Flow

How a representative request / command / job moves through the system, end to
end. Name the real entry points and the order of layers it passes through.

```
[entry: e.g. POST /api/x] → [auth/middleware] → [service] → [data layer] → [response]
```

Note any flows that deviate from this default path (background jobs, webhooks,
streaming, etc.) and why.

---

## 4. Data Model

The durable shapes of state. One row per significant entity — what it is, where
it lives, and the rules that govern it.

| Entity | Storage | Key fields | Owned by module | Invariants (see INVARIANTS.md) |
|--------|---------|------------|-----------------|--------------------------------|
| [Entity] | [table/store] | [fields] | `[module]` | INV-00N |

---

## 5. External Integrations

Every third-party service the system talks to, what it's used for, and where the
integration code lives. Note which are on a critical path (an outage breaks a
core flow) vs. best-effort.

| Service | Used for | Integration code | Critical? | Secret/env |
|---------|----------|------------------|-----------|------------|
| [Service] | [purpose] | `[file/dir]` | yes/no | `[ENV_VAR name only — never the value]` |

---

## 6. How to Run, Test, and Deploy

The minimum a new contributor needs to get the system running and verify a
change. Reference `docs/environment.md` rather than duplicating it.

- **Run locally:** [command(s)]
- **Run tests:** [command(s)]
- **Lint / typecheck:** [command(s)]
- **Deploy:** [reference `anymake-deploy` / the deploy doc]

---

## 7. Drift Log

Where the as-built code knowingly diverges from a planned ADR, or where intent
is undocumented. Each entry is either resolved (linked to a superseding decision
in DECISIONS.md) or open (needs a decision). The Cartographer never silently
"corrects" drift — it records it here for the intent conflict gate to resolve.

| # | Observed reality | Conflicts with | Status | Resolution |
|---|------------------|----------------|--------|------------|
| 1 | [what the code actually does] | ADR-00N / INV-00N | open / resolved | [superseding ADR or "needs decision"] |

---

*The map is a description of truth, not a wish. If the code and this file
disagree, the code is right and this file is stale — re-run the Cartographer.*
