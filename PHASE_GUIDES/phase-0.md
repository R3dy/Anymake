# Phase 0 — Foundation

**Goal:** Define the product completely before any research or building begins. When Phase 0 is complete, both you and Claude know exactly what we're building, why it will make money, and what success looks like.

**Duration:** One session

## Steps

### Step 0.1 — Project Identity

Draft the core product definition in `PROJECT.md`:

- **Name:** What do we call this?
- **Elevator pitch:** One sentence — what it is, who it's for, why it matters
- **Problem:** What specific pain does this solve? Who feels it acutely?
- **Solution:** What does this product actually do? Describe the user experience, not the tech.
- **Target audience:** Specific primary user — not "developers" but "solo founders building their first SaaS"
- **Unique angle:** Why will users choose this over alternatives? What's the edge?

Claude drafts a complete version based on whatever you provide. Do not ask for more input — make a recommendation and ask for corrections.

### Step 0.2 — Scope

Define the hard edges of this product:

**MVP scope:** The minimum feature set that creates real value for the primary user. Can a user complete their core job with just this?

**Explicitly in scope:**
- [Must-have feature A]
- [Must-have feature B]

**Explicitly out of scope for MVP:**
- [Feature C — goes to PARKING_LOT.md, revisit post-launch]
- [Feature D — not needed for core value proposition]

**Never building:**
- [Feature E — out of product scope entirely]

Tight scope = faster launch = faster validation. Err toward smaller, not larger.

### Step 0.3 — Revenue Model

Decide now how this product makes money. Changing the revenue model later means redesigning UX, architecture, and pricing flows.

**Choose the primary model:**

| Model | Use when | First revenue signal |
|-------|---------|---------------------|
| Freemium + paid tiers | Viral growth matters; free tier drives adoption | Paid tier upgrade |
| Subscription (monthly/annual) | Value is ongoing and predictable | Month 1 signup |
| Usage-based | Users pay proportional to what they consume | First usage event |
| One-time purchase | Value delivered once, no ongoing service | First sale |
| B2B seat licensing | Teams pay per user or per seat | First team signup |

**Document in PROJECT.md:**
- Primary model: [chosen model]
- Draft pricing tiers: [e.g., Free / $9 / $29 per month]
- Upgrade trigger: [The specific action or limit that makes paying obvious]
- Payment processor: Stripe (default unless strong reason to deviate)
- Free trial: [Yes — N days / No / Freemium forever]

### Step 0.4 — Success Definition

Define exactly what "launched successfully" looks like. Be specific enough that anyone can evaluate whether we hit it.

- **User success metric:** What does a user accomplish that proves the product works?
  - Example: "A user uploads a file and receives a processed result within 30 seconds"
- **Business metric:** The number that tells us there is demand
  - Example: "100 active users within 30 days of launch"
- **Revenue milestone:** The first meaningful revenue signal
  - Example: "5 paying subscribers within 30 days of public launch"
- **Go/no-go criteria:** Technical requirements that must be true before we ship
  - Example: "Core flow loads in under 2 seconds on mobile, zero-step deployment, error tracking in place"

### Step 0.5 — Team

- **Product Owner:** you — makes all product and business decisions, approves phase gates
- **Developer:** Claude — builds, plans, executes, reports
- **Specialists needed?** [designer / copywriter / domain expert — or none]

## Output

- `PROJECTS/[name]/PROJECT.md` — complete project foundation
- `PROJECTS/[name]/PHASE_STATE.md` — Phase 0 marked complete, Phase 1 queued
- `PROJECTS/[name]/PARKING_LOT.md` — initialized and empty, ready for out-of-scope ideas

## Gate

your reviews `PROJECT.md`. Key questions:
- Is the elevator pitch accurate?
- Is the MVP scope tight enough to ship fast?
- Does the revenue model make sense for this product type?
- Are the success metrics specific and measurable?

You say "looks good, start Discovery" → proceed to Phase 1.

## Templates

See `../TEMPLATES/project.md`
