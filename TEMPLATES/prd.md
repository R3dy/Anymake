# PRD — Template

Copy to `docs/02-planning/prd.md` for your project.

---

# [Project Name] — Product Requirements

**Version:** 1.0
**Date:** [date]
**Status:** Draft | Under Review | Approved

---

## Overview

[Elevator pitch from PROJECT.md — one sentence]

**MVP scope summary:** [2-3 sentences on what we're building and why this scope]

---

## User Profiles

### Primary User

**Persona name:** [Name]
**Role:** [Their role/context]
**Goals:** [What they're trying to accomplish]
**Pain points:** [Where current solutions fail them]
**Tech comfort:** High / Medium / Low
**Usage frequency:** Daily / Weekly / Monthly

---

## Feature Prioritization

Features rated by RICE: (Reach × Impact × Confidence) / Effort — higher score = higher priority

| Feature | Reach | Impact | Confidence | Effort | RICE | Priority |
|---------|-------|--------|------------|--------|------|---------|
| [Feature A] | [1-10] | [1-10] | [1-10] | [1-10] | [score] | Must Have |
| [Feature B] | | | | | | Must Have |
| [Feature C] | | | | | | Should Have |
| [Feature D] | | | | | | Nice to Have |

---

## Features

### Feature 1: [Name]

**Priority:** Must Have / Should Have / Nice to Have

**Description:**
What this feature does for the user, in plain language. Not how it works — what it does.

**User flow:**
1. User [action]
2. System [response]
3. User [action]
4. User sees [outcome]

**Acceptance criteria:**
- [ ] User can [specific action] and sees [specific result]
- [ ] System [specific behavior] when [specific condition]
- [ ] Error: When [error condition], user sees [specific message]
- [ ] Error: When [invalid input], [specific validation behavior]

**Edge cases:**
- What if [boundary condition]?
- What if [concurrent action]?
- What if [user has no data yet]?

**Non-functional requirements:**
- Performance: [response time target]
- Security: [auth requirement, data isolation]

---

### Feature 2: [Name]

[Repeat structure above]

---

### Feature N: Monetization (required)

**Priority:** Must Have

**Description:**
Users can upgrade to paid plans, manage their subscription, and access paid features.

**User flows:**
- Free user → hits limit → upgrade prompt → pricing page → Stripe Checkout → paid tier active
- Paid user → settings → billing → Customer Portal → cancel or update payment

**Acceptance criteria:**
- [ ] Pricing page shows all tiers with clear feature comparison
- [ ] Stripe Checkout completes and subscription activates
- [ ] Paid features are accessible after successful payment
- [ ] Free users see upgrade prompts at the right moments
- [ ] Payment failure triggers grace period and notification
- [ ] Cancellation downgrades to free after period end
- [ ] Customer Portal link works from Settings → Billing

---

## Non-Functional Requirements

### Performance
- Page load: < [X]s (LCP) on 4G mobile
- API response: < [X]ms P95
- Concurrent users: supports [N] concurrent without degradation

### Security
- Authentication required for all non-public routes
- Users can only access their own data
- All inputs validated and sanitized
- API keys never exposed to frontend
- HTTPS enforced, HTTP security headers configured

### Scale
- Initial load: [N] users at launch
- 12-month target: [N] users
- Database choices support this scale (verify in ADRs)

### Reliability
- Uptime target: [99.X%]
- Error tracking in place before launch
- Database backups configured

---

## Out of Scope (Post-MVP)

| Feature | Reason for deferral | Target phase |
|---------|--------------------|----|
| [Feature] | [Not needed for core value] | Post-launch |
| [Feature] | [Adds complexity without proportional value] | Post-launch |

---

## Open Questions

| Question | Owner | Status |
|---------|-------|--------|
| [Decision needed] | Royce | Open |
| [Technical question] | Operant | Open |

---

*Version history: increment version when significant changes made. Approved version is the Phase 2 gate version.*
