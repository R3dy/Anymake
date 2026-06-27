# INVARIANTS.md — Template

Copy to `PROJECTS/[name]/docs/INVARIANTS.md`. This file captures the product's
**non-negotiable behaviors and contracts** — the rules a change must never break,
distilled into one place so a feature-adding agent can check against them
quickly. ADRs record *decisions*; invariants record *behaviors that must always
hold* as a consequence of those decisions plus the product's intent.

Think of these as the things an original team member would catch in review with
"you can't do that — it breaks X." If a requested change would violate an
invariant, that is a hard conflict: it escalates and requires a superseding
decision before any code is written (same gate as superseding an ADR).

---

# [Project Name] — Invariants

**Last updated:** [date]
**Updated by:** [Cartographer | anymake-evolve | Phase 2/3]

---

## How to use this file

- Every invariant has a stable ID (`INV-001`, …) referenced from task briefs,
  the SYSTEM_MAP data model, and validation reports.
- An invariant is a statement that is **always true** about the running system,
  phrased so it can be checked: "All X must Y."
- The Worker is told which invariants its story touches; the Validator's
  intent-consistency check confirms none were broken.

---

## Invariants

| ID | Invariant (always true) | Why it exists | Where enforced | Source |
|----|-------------------------|---------------|----------------|--------|
| INV-001 | [e.g. All monetary amounts are stored and computed as integer minor units (cents).] | [rounding/float errors corrupt billing] | `src/[area]` | ADR-00N / success model |
| INV-002 | [e.g. Every webhook handler is idempotent — replaying the same event causes no duplicate side effects.] | [providers retry; double-charges are unacceptable] | `src/[webhook area]` | ADR-00N |
| INV-003 | [e.g. A user can only read or mutate rows they own; every data endpoint enforces an ownership check.] | [tenant isolation / security] | auth middleware | security baseline |

---

## Categories to consider when populating this file

Not all apply to every project type — keep only the live ones.

- **Data integrity** — units, precision, required relationships, soft-delete vs hard-delete.
- **Security & access** — ownership/tenant isolation, authentication boundaries, secret handling.
- **External contracts** — public API/CLI signatures that consumers depend on, versioning rules.
- **Idempotency & ordering** — webhooks, jobs, retries, exactly-once expectations.
- **Success-model guarantees** — behaviors the project type's success axis depends on (e.g. for a `library`, "no breaking changes to the public API without a major version bump").

---

*An invariant is a promise the product has already made. Breaking one silently is
the most expensive kind of regression — it is correct code that violates intent.*
