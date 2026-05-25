# Phase 1 — Discovery

**Goal:** Understand the market, users, and competitive landscape deeply before designing or planning anything. Discovery protects against building the right product for the wrong user, or the wrong product for the right user.

**Duration:** 1-3 sessions depending on product complexity

## Steps

### Step 1.1 — Market Context

Answer these questions for the product defined in `PROJECT.md`:

**Market size (rough order of magnitude):**
- TAM (Total Addressable Market): How many people globally have this problem?
- SAM (Serviceable Addressable Market): How many will actually pay for a software solution?
- SOM (Year 1 Target): How many can we realistically reach in year 1?

Estimates are fine. We need order of magnitude: "100M potential users" vs "100K potential users" fundamentally changes the strategy.

**Market timing:**
- Why does this product make sense now?
- What enabling factor — technology shift, behavior change, new regulation, market opening — makes this viable today?
- What would have blocked this product 5 years ago?

### Step 1.2 — Competitive Landscape

Map the full competitive space:

**Direct competitors** (solve the same problem the same way):

| Competitor | What they do | Strengths | Weaknesses | Pricing | Our edge |
|-----------|-------------|-----------|------------|---------|---------|
| [Name] | [description] | [what they do well] | [gaps] | [price] | [why we win] |

**Indirect competitors / workarounds** (solve the same problem differently):

| Alternative | How users use it | Why it's insufficient |
|------------|-----------------|----------------------|
| [Spreadsheet / manual process] | [description] | [why this falls short] |

**"Do nothing" baseline:**
- What do users do if they don't buy anything?
- Why might they stay with that approach instead of switching to us?

**Competitive conclusion:**
Write one paragraph on positioning. Are we 10x better? Cheaper? Faster to value? Targeting an underserved segment that big players ignore?

### Step 1.3 — User Understanding

Define the primary user deeply:

**User profile:**
- **Role/context:** Who exactly are they?
- **Goal:** What are they trying to accomplish?
- **Current workflow:** Step by step, how do they solve this problem today?
- **Pain points:** Where does the current approach break down?
- **Trigger:** What makes them go looking for a better solution?
- **Tech comfort:** High / Medium / Low

**Jobs to be Done:**

For each primary job the user is "hiring" our product to do:
```
When [situation/trigger],
I want to [action/motivation],
So I can [desired outcome].
```

Example: "When I get new benchmark data, I want to see how my build compares to similar builds, so I can decide if I need to upgrade my components."

**Workflow map:**

Current state (today):
1. [Step 1]
2. [Step 2 — note friction]
3. [Step 3]
→ Pain: [Where it breaks down, costs time, or causes errors]

Ideal state (with our product):
1. [Step 1]
2. [Step 2]
3. [Step 3]
→ Our role: [Where our product fits in and what it removes]

### Step 1.4 — Assumptions & Risks

**Key assumptions:**
Things we believe to be true that we haven't validated yet.

| Assumption | Why we believe it | Risk if wrong | How to validate |
|-----------|------------------|---------------|----------------|
| [assumption] | [evidence/reasoning] | [consequence] | [validation method] |

**Technical risks:**
- What are the hardest technical problems in this product?
- Are there known unknowns that could derail Phase 4?
- Any third-party dependencies that could fail or change pricing?

**Market risks:**
- What if the market is smaller than estimated?
- What if a well-funded competitor copies this quickly?
- What if users won't pay what we're planning to charge?

**Risk format:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| [risk] | H/M/L | H/M/L | [how we handle it] |

### Step 1.5 — Success Metrics Refinement

Revisit the Phase 0 success definition with discovery knowledge:

- Are the Phase 0 metrics still the right metrics?
- What **activation metric** tells us a user actually got value (not just signed up)?
- What **leading indicator** predicts retention? (The action in the first session that correlates with coming back)
- What **engagement metric** distinguishes real users from tourists?

Update `PROJECT.md` if discovery changed the understanding of the target user, scope, or value proposition.

## Output

- `docs/01-discovery.md` — comprehensive discovery document
- `docs/COMPETITORS.md` — full competitive analysis table
- Updated `PROJECT.md` — if discovery changed scope, user definition, or success metrics

## Gate

Royce reviews `docs/01-discovery.md`. Key questions:
- Does the competitive positioning hold up?
- Are we targeting the right user?
- Are the key assumptions reasonable?
- Does the market opportunity justify building this?

Royce says "discovery complete, start planning" → proceed to Phase 2.

## Templates

See `../TEMPLATES/discovery.md`
