# Monetization Plan — Template

Copy to `docs/02-planning/monetization.md` for your project.

---

# [Project Name] — Monetization Plan

**Version:** 1.0
**Date:** [date]
**Revenue model:** [Freemium / Subscription / Usage-based / One-time / B2B seats]

---

## Pricing Tiers

| Tier | Price (monthly) | Price (annual) | Target user | Upgrade trigger |
|------|----------------|----------------|------------|----------------|
| Free | $0 | $0 | [who this is for] | [what forces upgrade] |
| [Starter] | $[X]/mo | $[X×10]/yr | [who pays this] | [what makes them upgrade] |
| [Pro] | $[XX]/mo | $[XX×10]/yr | [who pays this] | [enterprise/volume need] |

Annual price = monthly × 10 (2 months free — standard industry offer).

### Feature / Limit Matrix

| Feature or Limit | Free | Starter | Pro |
|-----------------|------|---------|-----|
| [Core resource] | [N] | [N×10] | Unlimited |
| [Key feature A] | ✓ | ✓ | ✓ |
| [Paid feature B] | — | ✓ | ✓ |
| [Pro feature C] | — | — | ✓ |
| Support | Community | Email | Priority |

### The Upgrade Trigger

The single most important pricing decision.

**Primary trigger:** [Specific action or limit — e.g., "User creates their 4th project (free limit is 3)"]

**Is the trigger visible before users hit it?** [Yes / No — must be Yes]

**Do most free users hit the trigger within 30 days?** [Yes / No — should be Yes]

**Upgrade prompt text:** "[You've used X of Y free projects. Upgrade to create unlimited projects.]"

**Secondary triggers:**
- [Feature unlock — e.g., "Export to CSV is Pro only — upgrade CTA on export button"]
- [Collaboration — e.g., "Invite team members is paid only"]

### Pricing Rationale

[Why these specific price points? Competitor comparison? Value-based reasoning? What will the target user pay?]

---

## Technical Implementation

### Stripe Configuration

**Products to create in Stripe Dashboard:**
```
Product: "[Product Name] Starter"
  Price: $[X].00 USD / month (recurring)
  Price: $[X×10].00 USD / year (recurring)
  Metadata: tier=starter

Product: "[Product Name] Pro"
  Price: $[XX].00 USD / month (recurring)
  Price: $[XX×10].00 USD / year (recurring)
  Metadata: tier=pro
```

**Webhook endpoint:** `POST /api/webhooks/stripe`

**Webhook events to handle:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription in DB, set tier to paid |
| `customer.subscription.updated` | Update tier in DB (handles upgrades and downgrades) |
| `customer.subscription.deleted` | Set tier to free in DB |
| `invoice.payment_failed` | Set status to past_due, start grace period, send email |
| `invoice.paid` | Update subscription_period_end, clear past_due status |

### Database Schema (subscription columns)

Add to users table (or create a separate subscriptions table):

```sql
stripe_customer_id        VARCHAR  -- Stripe customer ID (cus_...)
stripe_subscription_id    VARCHAR  -- Stripe subscription ID (sub_...)
subscription_tier         VARCHAR  -- 'free' | 'starter' | 'pro'
subscription_status       VARCHAR  -- 'active' | 'trialing' | 'past_due' | 'canceled'
subscription_period_end   TIMESTAMP -- When current period ends
trial_end                 TIMESTAMP -- When trial ends (if applicable)
```

### Feature Gating (pseudocode)

```typescript
// Core gating functions — implement in your stack
function getUserTier(userId: string): 'free' | 'starter' | 'pro'
function canAccessFeature(userId: string, feature: string): boolean
function checkLimit(userId: string, resource: string, currentCount: number): boolean

// Usage in API endpoint:
const tier = await getUserTier(userId)
if (tier === 'free' && currentProjectCount >= FREE_LIMIT) {
  return { error: 'limit_reached', upgradeUrl: '/pricing' }
}

// Usage in frontend:
if (!canAccessFeature(user.id, 'csv_export')) {
  return <UpgradePrompt feature="CSV export" />
}
```

---

## User Flows

### New User → Free Tier

```
Signup → Email verification (if used) → Onboarding → Dashboard (free tier)
Limits visible but not blocking (show "X of Y used" on relevant UI)
```

### Free → Paid Upgrade

```
Trigger: User hits limit OR clicks "Upgrade" in nav
  ↓
Pricing page (clear tier comparison, annual discount shown)
  ↓
User selects plan → Stripe Checkout
  (pre-fill: email from user session, success URL, cancel URL)
  ↓
Stripe processes payment → sends checkout.session.completed webhook
  ↓
Webhook: set subscription_tier = 'starter'/'pro', subscription_status = 'active'
  ↓
User redirected to /dashboard?upgrade=success
  ↓
Success message: "Welcome to [Tier]! Your limits have been removed."
```

### Payment Failure

```
Invoice payment fails in Stripe → sends invoice.payment_failed webhook
  ↓
Webhook: set subscription_status = 'past_due'
  ↓
User sees banner: "Your payment failed. Update your payment method to keep access."
  (Banner links to Stripe Customer Portal)
  ↓
Grace period: [7 days] — user retains full access
  ↓
If not resolved after grace period:
  Stripe sends customer.subscription.deleted
  Webhook: set subscription_tier = 'free'
  User loses paid features
```

### Cancellation

```
User: Settings → Billing → [Manage billing] → Stripe Customer Portal
  ↓
Customer Portal: Cancel subscription (Stripe handles confirmation)
  ↓
Stripe sends customer.subscription.deleted at period end
  ↓
Webhook: set subscription_tier = 'free', subscription_status = 'canceled'
  ↓
User retains access until subscription_period_end (Stripe default behavior)
  ↓
[Optional] Win-back email at day 7 post-cancellation
```

---

## Revenue Targets and Metrics

### 90-Day Targets

| Metric | Target | Actual |
|--------|--------|--------|
| MRR at 30 days | $[X] | |
| MRR at 60 days | $[X] | |
| MRR at 90 days | $[X] | |
| Free → paid conversion | [X]% | |
| Monthly churn | < [X]% | |

### Key Formulas

| Metric | Formula |
|--------|---------|
| MRR | Sum of all active monthly subscriptions |
| ARR | MRR × 12 |
| ARPU | MRR / number of paying users |
| LTV | ARPU / monthly churn rate |
| Conversion rate | Paying users / total signups |

---

## Pre-Launch Monetization Checklist

- [ ] Stripe account in live mode
- [ ] Products and prices created in Stripe Dashboard (live mode)
- [ ] Webhook endpoint registered and verified in Stripe Dashboard
- [ ] Webhook signature verification implemented
- [ ] Complete payment flow tested in production with real card
- [ ] Payment failure flow tested (use Stripe test card 4000 0000 0000 0002)
- [ ] Cancellation flow tested end-to-end
- [ ] Customer Portal accessible from settings
- [ ] Feature gating verified for each tier
- [ ] Free limits enforced correctly
- [ ] Revenue visible in Stripe dashboard

---

*Update when pricing changes. Document the rationale for pricing changes the same way as ADRs.*
