# Metrics Dashboard — Template

Post-launch tracking reference. Copy data into your analytics tool; use this as the review framework.

---

# [Project Name] — Metrics Dashboard

**Review cadence:** Weekly (every Monday)
**Analytics tool:** [PostHog / Mixpanel / Plausible / Amplitude]
**Revenue tool:** Stripe Dashboard + internal DB

---

## AARRR Funnel

### Acquisition — How are users finding us?

| Channel | Visitors | Signups | Conv. rate | Week-over-week |
|---------|---------|---------|-----------|---------------|
| Organic search | | | | |
| Direct | | | | |
| Referral / word-of-mouth | | | | |
| Product Hunt | | | | |
| Social (Twitter/LinkedIn) | | | | |
| Newsletter | | | | |
| Paid (if running ads) | | | | |
| **Total** | | | | |

**Goal:** Identify the 2 highest-converting acquisition channels. Double down on those. Cut the rest.

---

### Activation — Are users getting value in their first session?

**"Aha moment" definition:** [The specific action that indicates a user got value — e.g., "created first project", "completed first analysis", "sent first message"]

| Metric | This week | Last week | Target | Trend |
|--------|-----------|-----------|--------|-------|
| New signups | | | | |
| Completed onboarding | | | [X]% | |
| Completed aha moment action | | | [X]% | |
| Time to aha moment (median) | | | < [X] min | |
| Day 1 retention | | | [X]% | |

**If aha moment completion < 40%:** The onboarding or first-run experience needs work before growth spending.

---

### Retention — Are users coming back?

| Metric | This week | Last week | Target | Trend |
|--------|-----------|-----------|--------|-------|
| DAU (Daily Active Users) | | | | |
| WAU (Weekly Active Users) | | | | |
| MAU (Monthly Active Users) | | | | |
| DAU / MAU ratio | | | > [X]% | |
| Day-7 retention | | | [X]% | ↑ ↓ → |
| Day-30 retention | | | [X]% | |

**Retention benchmarks by product type:**
- Consumer SaaS: D7 ~25%, D30 ~15%
- B2B SaaS: D7 ~40%, D30 ~25%
- Developer tools: D7 ~35%, D30 ~20%

**If D7 retention < 20%:** Fix product-market fit before investing in growth.

---

### Revenue — Are users paying?

| Metric | This month | Last month | Target | Trend |
|--------|-----------|-----------|--------|-------|
| MRR | $ | $ | $[X] | |
| New MRR (new subscribers) | $ | $ | | |
| Expansion MRR (upgrades) | $ | $ | | |
| Churned MRR (cancellations) | $ | $ | | |
| Net New MRR | $ | $ | | |
| ARR (MRR × 12) | $ | $ | | |
| Paying users | # | # | | |
| Free → Paid conversion rate | % | % | [X]% | |
| Monthly churn rate | % | % | < [X]% | |
| ARPU (MRR / paying users) | $ | $ | $[X] | |
| LTV (ARPU / churn rate) | $ | $ | $[X] | |

**Revenue health signals:**
- Net New MRR > 0 every month: growing
- Churn < 5%/month: healthy for early-stage
- LTV / CAC > 3: sustainable acquisition economics

---

### Referral — Are users telling others?

| Metric | This month | Last month | Target |
|--------|-----------|-----------|--------|
| NPS score | | | > 40 |
| % signups with no referral source | | | |
| Referral program signups (if applicable) | | | |
| Social mentions / shares | | | |

**NPS survey:** Send to active users monthly. "How likely are you to recommend [product] to a friend or colleague? (0-10)"

---

## Product Health

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Core Web Vitals: LCP | | < 2.5s | ✅ / ⚠️ / ❌ |
| Core Web Vitals: FID | | < 100ms | |
| Error rate (Sentry) | | < 1% of sessions | |
| API P95 latency | | < 500ms | |
| Uptime (30-day) | | > 99.5% | |
| Apdex score | | > 0.9 | |

---

## Support Health

| Metric | This week | Target |
|--------|-----------|--------|
| Tickets received | | |
| Tickets resolved | | |
| Avg first response time | | < 24h |
| Open tickets | | < 10 |
| Top recurring issue | | "None" |

**If top recurring issue persists > 2 weeks:** It's a product bug, not a support issue. Fix it.

---

## Revenue Projections

Based on current MRR and growth rate:

| Month | Projected MRR | Actual MRR |
|-------|--------------|-----------|
| Month 1 | $ | $ |
| Month 2 | $ | $ |
| Month 3 | $ | $ |
| Month 6 | $ | |
| Month 12 | $ | |

MRR projection = current MRR × (1 + monthly growth rate)^N

---

## Weekly Review Format

Use every Monday. Takes 15 minutes.

**Week of [date]**

1. **Biggest win:** [What metric moved most positively?]
2. **Biggest concern:** [What's below target or declining?]
3. **User feedback theme:** [Most common thing users said this week]
4. **One thing to change:** [Based on data, what are we doing differently this week?]
5. **This week's focus:** [Top priority for the coming week]

---

*Review weekly. Metrics that aren't tracked can't improve. Metrics that aren't reviewed are theater.*
