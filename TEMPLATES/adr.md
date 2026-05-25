# ADR — Template

Architecture Decision Record. One file per decision. Store in `docs/02-planning/architecture/`.

---

# ADR-[number]: [Title]

**Date:** [date]
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-[n]

---

## Context

What decision are we making? What situation requires a choice? Include relevant constraints:
- Product requirements that drive this decision
- Team capability constraints
- Budget or scale constraints
- Time constraints

---

## Decision

What did we decide to do? State it clearly in one sentence.

**Decision:** We will use [choice].

---

## Options Considered

| Option | Pros | Cons | Eliminated because |
|--------|------|------|-------------------|
| [Option A — chosen] | [pro] | [con] | — |
| [Option B] | [pro] | [con] | [reason rejected] |
| [Option C] | [pro] | [con] | [reason rejected] |

---

## Consequences

### Positive
- [What improves as a result of this decision]
- [Developer experience improvement]
- [User experience improvement]

### Negative / Trade-offs
- [What we give up]
- [What becomes harder]
- [Scale or capability limit]

### Risks
- [What could go wrong with this choice]
- [When we might need to revisit this decision]

---

## Related Decisions

- ADR-[n]: [Title — how it relates]
- ADR-[n]: [Title — how it relates]

---

*ADRs are immutable once accepted. To change a decision: deprecate this ADR, create a new one, update the Status field here to "Superseded by ADR-[n]".*
