---
name: anymake-security-review
description: Use to run Anymake's security review — the per-PR checklist the Validator applies, the full Phase 4 Step 4.5 security pass before staging, and the pre-launch security gate. Triggers on "security review", "audit for vulnerabilities", "is this secure", "pen-test checklist", "check auth/authorization", "secrets scan", or Anymake Phase 4 Step 4.5. Returns PASS / FAIL / ESCALATE; security failures always escalate to a human regardless of autonomous mode. Defensive use only.
---

# Anymake Security Review

The canonical home for Anymake's security checks. Security happens at three
moments — and they share one checklist so nothing drifts:

| Moment | Scope | Driven by |
|--------|-------|-----------|
| **Per-PR** (Phase 4.3) | The diff in one story's PR | The Validator (`AGENTS/validator.md`) runs the core checklist on every PR |
| **Full pass** (Phase 4.5) | The whole built product before staging review | The hub invokes this skill at Step 4.5 (Integration and Security Review) |
| **Pre-launch gate** (Phase 5.1) | Final confirmation before production deploy (5.2) | `anymake-deploy` requires a PASS here |

This is defensive review of code being shipped. Not for offensive tooling.

## When to use

- Hub **Phase 4, Step 4.5 (Integration and Security Review)** — full security pass before staging review.
- Inside `anymake-build-loop` — the Validator applies the core checklist per PR.
- Before production in `anymake-deploy`.
- Directly — "security review this", "audit before I ship".

## The checklist

**Core (every PR — the Validator's checklist):**

- [ ] Input validation on all user-supplied data (server-side, not just client)
- [ ] Authorization checks — a user can only access their own resources
- [ ] No secrets in code or logs
- [ ] Parameterized queries — no string-concatenated SQL
- [ ] Output encoding wherever user data is rendered
- [ ] Error messages don't leak internals (stack traces, queries, infra)

**Full pass (Phase 4.4 — superset, the whole product):**

- [ ] All inputs validated server-side
- [ ] Authentication required on every non-public endpoint
- [ ] Authorization enforced (no IDOR — users can't reach others' data)
- [ ] Secrets in environment/secret store, never committed
- [ ] SQL injection prevented (parameterized queries / ORM)
- [ ] XSS prevented (output encoding, CSP headers)
- [ ] CSRF protection on state-changing requests
- [ ] Rate limiting on public endpoints
- [ ] Dependencies scanned for known vulnerabilities
- [ ] HTTPS enforced, secure cookies, security headers set

Read `PROJECT_TYPES/<id>/manifest.md` → **Gate Criteria Deltas** for type-specific
additions or skips (e.g. an `api-service` weights authn/authz and rate limiting
heavily; a `static-site` focuses on headers, dependencies, and no leaked secrets).

## Verdict

Return one of three, using the same lexicon as the Validator and Product Owner Proxy:

- **PASS** — every applicable box checked. Safe to merge / proceed to staging / launch.
- **FAIL** — one or more fixable issues. Return the specific items so they can be
  fixed (bounded by the retry policy in `AGENTS/policies.md`), then re-review.
- **ESCALATE TO USER** — anything touching **auth, payments, or webhooks**, or a
  finding you can't resolve. This always pauses for a human — **even in
  autonomous mode**. That override is absolute.

## How to run a pass

1. Scope it (one PR, or the whole product) and load the right checklist tier.
2. Read the code for each item — don't assume; trace inputs to sinks
   (delegate broad searches to a sub-agent to keep context focused).
3. Run available automated checks: dependency/vulnerability scan, secret scan,
   static analysis if configured.
4. Record findings against each box in `TEMPLATES/validation-report.md` style.
5. Emit the verdict; on FAIL list specific remediations; on security-sensitive
   findings, ESCALATE.

## Guardrails

- **Security failures never auto-pass** — autonomous mode cannot override an escalation.
- **No secrets in the report itself** — reference locations, don't paste secrets.
- **Defensive only** — this skill reviews code to make it safe; it does not build
  exploits or attack tooling.
