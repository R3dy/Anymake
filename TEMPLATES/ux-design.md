# UX Design — Template

Copy to `docs/02-planning/ux-design.md` for your project.

---

# [Project Name] — UX Design

**Version:** 1.0
**Date:** [date]
**Status:** Draft | Approved

---

## User Flow Diagrams

### Flow 1: [Primary Task — e.g., "New user onboarding to first value"]

```
Entry: [Landing page / Invite link / App URL]
  ↓
[Step 1: e.g., Click "Get Started"]
  ↓
[Step 2: e.g., GitHub OAuth]
  ↓
[Step 3: e.g., Brief onboarding — "What will you use this for?"]
  ↓
[Step 4: e.g., Redirect to Dashboard]
  ↓
Success state: [User sees dashboard with clear first action prompt]

Error paths:
  → OAuth fails: "We couldn't sign you in. Try again?" [Retry button]
  → Email already exists: "You already have an account. Sign in instead."
```

---

### Flow 2: [Core Feature — e.g., "User completes primary value action"]

```
Entry: [Dashboard / Nav item]
  ↓
[Step 1]
  ↓
[Step 2]
  ↓
Success: [What the user sees when it works]

Error paths:
  → [Error condition]: [User message + recovery action]
```

---

### Flow 3: Upgrade Flow (required)

```
Trigger: Free user hits limit OR clicks "Upgrade" in nav

Option A — Limit hit:
  [Limit message] + [Upgrade CTA]
  ↓
Option B — Proactive upgrade:
  Nav → Upgrade
  ↓
Pricing page / modal
  ↓
User selects plan → Stripe Checkout (pre-filled email)
  ↓
Payment succeeds → Redirect to app
  ↓
Success state: Subscription active, limit removed, confetti optional

Error path:
  Payment fails → "Payment didn't go through. Check your card details." [Retry / Update card]
```

---

### Flow 4: [Additional flow as needed]

---

## Information Architecture

### Route Map

| Route | Page | Auth required | Notes |
|-------|------|--------------|-------|
| `/` | Landing / Marketing | No | Conversion-focused |
| `/login` | Login / OAuth | No | Redirect to dashboard if already authed |
| `/signup` | Signup | No | Or combined with `/login` |
| `/dashboard` | User dashboard | Yes | Home screen after login |
| `/[feature]` | [Core feature page] | Yes | |
| `/settings` | Account settings | Yes | |
| `/settings/billing` | Billing management | Yes | Stripe Customer Portal link |
| `/pricing` | Pricing page | No | Visible to all |
| `/404` | Not found | No | |

### Navigation

**Authenticated nav:**
- [Item 1] → `/route`
- [Item 2] → `/route`
- Upgrade (if free user) → `/pricing`
- Settings → `/settings`
- Sign out

**Public nav:**
- Logo → `/`
- [Features] → `/#features`
- Pricing → `/pricing`
- Sign in → `/login`
- Get started → `/signup` or scroll to CTA

---

## Key Screen Wireframes

### Landing Page

```
┌──────────────────────────────────────────────┐
│ [Logo]          [Features] [Pricing] [Sign in] [Get started →] │
├──────────────────────────────────────────────┤
│                                              │
│           [Hero headline]                   │
│        [Sub-headline — 1 sentence]          │
│                                              │
│    [Primary CTA button]  [Secondary CTA]    │
│                                              │
│    [Social proof — "Used by X users"]       │
│                                              │
├──────────────────────────────────────────────┤
│  [Feature 1]    [Feature 2]    [Feature 3]  │
│  [Icon + title] [Icon + title] [Icon + title]│
│  [2-line desc]  [2-line desc]  [2-line desc] │
└──────────────────────────────────────────────┘
```

### Dashboard (Logged In)

```
┌──────────────────────────────────────────────┐
│ [Logo]   [Nav items]              [Avatar ▼] │
├──────────────────────────────────────────────┤
│ [Page title]                [+ New / Action] │
│                                              │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │ Stat 1   │  │ Stat 2   │  │ Stat 3   │   │
│ │ [number] │  │ [number] │  │ [number] │   │
│ └──────────┘  └──────────┘  └──────────┘   │
│                                              │
│ [Primary data list / table / feed]          │
│  [Row 1]                                    │
│  [Row 2]                                    │
│  [Row 3]                                    │
└──────────────────────────────────────────────┘
```

Dashboard empty state:
```
┌──────────────────────────────────────────────┐
│ [Logo]   [Nav]                    [Avatar ▼] │
├──────────────────────────────────────────────┤
│                                              │
│              [Illustration]                 │
│         "You haven't [done X] yet."         │
│     "Start by creating your first [X]."     │
│                                              │
│            [Create first X →]               │
│                                              │
└──────────────────────────────────────────────┘
```

### Core Feature Screen

```
[Describe layout specific to this product's primary feature]
```

### Pricing Page

```
┌──────────────────────────────────────────────┐
│                "Choose your plan"            │
│              [Monthly | Annual toggle]       │
│                                              │
│ ┌──────────┐  ┌────────────┐  ┌──────────┐ │
│ │  Free    │  │  Pro  ★    │  │ Business │ │
│ │  $0/mo   │  │  $X/mo     │  │  $XX/mo  │ │
│ │          │  │            │  │          │ │
│ │ ✓ Feat A │  │ ✓ Feat A   │  │ ✓ All    │ │
│ │ ✓ Feat B │  │ ✓ Feat B   │  │ ✓ All    │ │
│ │ [Limit N]│  │ ✓ Feat C   │  │ ✓ Custom │ │
│ │          │  │ Unlimited  │  │          │ │
│ │[Get Free]│  │ [Get Pro]  │  │[Contact] │ │
│ └──────────┘  └────────────┘  └──────────┘ │
│                                              │
│         "Questions? [Talk to us]"            │
└──────────────────────────────────────────────┘
```

### Settings / Billing

```
[Account settings tab]
- Name: [editable field]
- Email: [display / editable]
- Password: [change password link]
- Delete account: [danger zone]

[Billing tab]
- Current plan: [tier] — [status: active / past_due / canceled]
- Next billing date: [date]
- [Manage billing →] (opens Stripe Customer Portal)
- [Upgrade plan →] (if on free tier)
```

---

## Empty States

| Screen | Message | Primary CTA |
|--------|---------|------------|
| Dashboard — no data | "You haven't [done X] yet." | "Create your first [X]" |
| [Feature] — no results | "[Helpful context about why empty]" | "[Relevant action]" |
| [Search] — no results | "No results for '[query]'" | "Clear search" |

---

## Error States

| Error | User-facing message | Recovery |
|-------|--------------------|---------  |
| Auth failure | "We couldn't sign you in. Try again?" | Retry button |
| Generic API error | "Something went wrong. We're looking into it." | Retry / Reload |
| Form validation | [Inline field error — specific] | Inline fix |
| Payment failed | "Payment didn't go through. Check your card details." | Update payment |
| Rate limited | "You've reached your [free] limit. Upgrade to continue." | Upgrade CTA |
| Network offline | "You appear to be offline." | Auto-retry on reconnect |
| Session expired | "Your session has expired. Please sign in again." | Redirect to login |

---

*UX Design locked at Phase 2 gate. Changes during implementation go through Royce.*
