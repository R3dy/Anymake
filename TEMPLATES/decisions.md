# DECISIONS.md — Template

Copy to `PROJECTS/[name]/docs/DECISIONS.md`. This is the **living decision log**:
a single index of every architecture decision the product has ever made, with its
current status. Individual ADR files still live in
`docs/02-planning/architecture/` (Phase 2) and are added there as the product
evolves — this file is the index that makes them findable and shows which are
still in force.

**The cardinal rule: decisions are never deleted, only superseded.** When a new
feature needs to change a past decision, you do not edit or remove the old ADR —
you write a new ADR that supersedes it, mark the old one `Superseded by ADR-N`,
and add the new one here. The *why* of every past choice must survive, so a
future contributor never re-litigates a decision without seeing its history.

---

# [Project Name] — Decision Log

**Last updated:** [date]
**Updated by:** [Cartographer | anymake-evolve | Phase 2]

---

## Active Decisions

Decisions currently in force. A new change must be consistent with every row
here, or explicitly supersede one (see "Superseding a Decision" below).

| ADR | Title | Decision (one line) | Status | File |
|-----|-------|---------------------|--------|------|
| ADR-001 | [Title] | We will use [choice] because [driver] | Accepted | `docs/02-planning/architecture/adr-001-*.md` |
| ADR-002 | [Title] | [decision] | Accepted | `docs/.../adr-002-*.md` |

---

## Superseded Decisions

Kept for history. Never delete a row — move it here and link the replacement.

| ADR | Title | Original decision | Superseded by | Why it changed |
|-----|-------|-------------------|---------------|----------------|
| ADR-00N | [Title] | [what we used to do] | ADR-00M | [the new constraint or learning that forced the change] |

---

## Superseding a Decision

The only legitimate way to contradict a past decision. Used by `anymake-evolve`
when a requested feature conflicts with an Active Decision.

1. **Do not edit the old ADR's Context/Decision.** Set its `Status:` to
   `Superseded by ADR-N` and move its row to *Superseded Decisions* here.
2. **Write a new ADR** (`TEMPLATES/adr.md`) that states the new decision, and in
   its *Context* explicitly names what it replaces and the new constraint or
   learning that justifies the change.
3. **Add the new ADR** to *Active Decisions* above.
4. **A superseding ADR requires a gate** — explicit user approval, or the
   Product Owner Proxy in autonomous mode. An agent never supersedes a decision
   on its own authority.

---

*Append-only by intent. The history of why is more valuable than the tidiness of
the list.*
