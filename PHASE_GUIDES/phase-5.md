# Phase 5 — Launch

**Goal:** Ship to real users, measure what matters, iterate on signal.

**Duration:** Ongoing — Phase 5 is a continuous loop, not a phase that completes

## Step 5.1 — Pre-Launch Checklist

Complete every item in `TEMPLATES/launch-checklist.md` before going public. Key categories:

**Production environment:**
- [ ] All environment variables configured in production (not test keys)
- [ ] Stripe in live mode (`sk_live_` not `sk_test_`)
- [ ] Custom domain configured and SSL active
- [ ] DNS fully propagated

**Monitoring:**
- [ ] Error tracking active and receiving events (Sentry)
- [ ] Uptime monitoring configured (alert within 1 minute of downtime)
- [ ] Performance monitoring active

**Analytics:**
- [ ] Pageview tracking active
- [ ] Signup event tracked
- [ ] "Aha moment" action tracked (the core value event that predicts retention)
- [ ] Payment conversion tracked
- [ ] Revenue visible in Stripe dashboard

**Legal:**
- [ ] Privacy policy page live
- [ ] Terms of service page live
- [ ] Cookie consent (if targeting EU users)
- [ ] Account deletion flow exists (required for GDPR/CCPA)

**Support:**
- [ ] Support email configured and monitored
- [ ] Support channel exists (email, Discord, or Intercom)
- [ ] Response SLA defined

## Step 5.2 — Production Deployment

- [ ] Final code on main branch (all PRs merged)
- [ ] Deploy to production (release tag or manual approval)
- [ ] Smoke test production URL — not staging, the real production URL
- [ ] Test complete user flow in production including real payment
- [ ] Monitor error tracking for 30 minutes post-deploy

Abort and roll back if any critical errors appear in the first 30 minutes.

## Step 5.3 — Beta Launch (Soft Launch)

Before announcing publicly, get 10-50 real users to validate in production.

**How to get beta users:**
- Personal network (fastest — message people directly)
- Communities where the target user spends time
- Waitlist collected during build phase

**Beta goals:**
- Validate the core user flow works in real-world conditions
- Catch production bugs that didn't appear in staging
- Get first feedback on UX and value proposition clarity
- Confirm the payment flow works with real cards

**Beta success criteria before public launch:**
- [ ] 10+ users completed the core value flow
- [ ] Zero critical bugs in payment flow
- [ ] At least 1 user provided unsolicited positive feedback
- [ ] At least 1 paying customer (if not freemium)

## Step 5.4 — Public Launch

**Choose 2-3 channels. Execute each one well.**

| Channel | Use when | Approach |
|---------|---------|---------|
| Product Hunt | Consumer / prosumer SaaS | Schedule, prepare visuals, engage every comment on launch day |
| Hacker News Show HN | Developer tools, technical products | Honest post, respond to all comments for 6+ hours |
| Reddit | Niche product, active subreddit exists | Post in specific relevant subreddits — not just startup subs |
| Twitter/X | Visual products, existing audience | Thread with product screenshots and value story |
| LinkedIn | B2B, team products | Post with value framing — not self-promotion |
| Direct outreach | B2B, high-value accounts | 50 personalized emails to ideal customers |
| Newsletter | Existing subscriber base | Dedicated launch email with early access offer |

**Launch day protocol:**
- [ ] Launch post live / scheduled
- [ ] Error tracking and uptime monitoring dashboards open
- [ ] Respond to every comment or question within 2 hours
- [ ] Log all feedback (positive and negative) in a document

## Step 5.5 — AARRR Metrics Dashboard

Set up the metrics dashboard using `TEMPLATES/metrics-dashboard.md`. Track the full funnel.

**Acquisition — How are users finding us?**
- Traffic by channel
- Signup conversion rate by source
- Cost per acquisition (if running paid)

**Activation — Are users getting value in their first session?**
- Completion rate for "aha moment" action
- Time from signup to first value (shorter = better)
- Day 1 retention (% who return the next day)

The aha moment is the single most important activation metric. Define it precisely (e.g., "user creates first project", "user runs first analysis", "user sends first message") and measure it directly.

**Retention — Are users coming back?**
- Day 7 retention
- Day 30 retention
- Weekly Active Users trend (WAU)

If Day 7 retention is below 20%, fix retention before spending on acquisition.

**Revenue — Are users paying?**
- MRR (Monthly Recurring Revenue)
- Net New MRR (new MRR - churned MRR)
- Free → paid conversion rate
- Monthly churn rate
- LTV (ARPU / churn rate)

**Referral — Are users telling others?**
- NPS score (send monthly survey to active users)
- % of signups with no referral source (organic/word-of-mouth)

## Step 5.6 — Iteration

After 2-4 weeks of launch data, start the iteration cycle.

**Incoming triage (run this weekly):**

| Type | Action |
|------|--------|
| Critical bug (blocks core flow) | Fix immediately, deploy same day |
| High-friction UX issue (hurts activation/retention) | Fix in next session |
| Performance issue | Schedule after bugs |
| Feature request | Add to PARKING_LOT.md |

**Prioritization score for each item:**

Score = (Retention impact + Conversion impact) / Effort

- Retention impact: 0-10 — does fixing this make users more likely to return?
- Conversion impact: 0-10 — does fixing this make users more likely to pay?
- Effort: 1 (quick) / 2 (medium) / 3 (large)

Build the highest-scoring items first.

**Pricing validation:**

If free → paid conversion is below target:
- Survey churned users: what would have made them pay?
- Survey active free users: what would make them upgrade now?
- A/B test upgrade prompt placement or messaging
- Consider adjusting free tier limits (tighter usually increases conversion)

**Post-MVP roadmap:**

When the bug and polish cycle is complete, return to PARKING_LOT.md. Start a new feature cycle:
- Phase 2: Plan the next feature set
- Phase 3: Break into epics and stories
- Phase 4: Build it
- Phase 5: Ship it

BMad is a cycle. The product never stops improving.

## Output

- Live product at production URL
- Metrics dashboard populated with first 30 days of real data
- Bug backlog (triaged by priority score)
- Feature backlog (from PARKING_LOT.md + user requests)
- Pricing validation findings (if conversion is below target)

## Gate

Phase 5 does not complete. When a feature cycle finishes, the loop returns to Phase 2.
