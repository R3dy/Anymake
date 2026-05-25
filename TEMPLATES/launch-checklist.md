# Launch Checklist — Template

Complete every item before declaring "ready for public launch." Customize items for your product.

---

# [Project Name] — Launch Checklist

**Target launch date:** [date]
**Checklist owner:** Operant
**Final sign-off:** Royce

---

## Production Environment

- [ ] Custom domain configured (not just hosting subdomain)
- [ ] SSL certificate valid and auto-renewing
- [ ] DNS fully propagated (verify from dnschecker.org)
- [ ] All environment variables set in production
- [ ] Production uses live Stripe keys (`sk_live_`, `pk_live_`)
- [ ] Production and staging use separate databases
- [ ] Production database has automated backups configured
- [ ] No `.env` files committed to the repository

---

## Application Health

- [ ] Application loads at production URL (200 OK)
- [ ] All key routes return expected status codes
- [ ] No JavaScript errors in browser console on main pages
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Mobile layout tested (375px and 768px widths)
- [ ] Custom 404 page styled and tested
- [ ] Server error page (500) gracefully handled

---

## Authentication

- [ ] Sign up flow works in production
- [ ] Sign in flow works in production
- [ ] Sign out works
- [ ] Password reset works end-to-end (if using email auth)
- [ ] OAuth callback URL registered for production domain (not localhost)
- [ ] Session expiry behaves correctly
- [ ] Protected routes redirect unauthenticated users to login

---

## Core User Flow

- [ ] Complete happy path from signup to core value works in production
- [ ] All critical user flows tested manually in production
- [ ] No broken links on any page reachable from the nav
- [ ] Empty states display correctly

---

## Payments (Stripe)

- [ ] Stripe account in **live mode** — double-check
- [ ] Live Stripe keys in production environment variables
- [ ] Stripe webhook endpoint registered for production URL
- [ ] Webhook secret is production secret (whsec_ from live mode)
- [ ] Test payment completed with real card in production
- [ ] Payment success flow works (redirect + subscription activated)
- [ ] Payment failure flow tested (card 4000 0000 0000 0002 in test first)
- [ ] Cancellation flow tested
- [ ] Stripe Customer Portal accessible from settings
- [ ] Invoice emails delivered correctly (check in Stripe dashboard)

---

## Monitoring and Observability

- [ ] Error tracking active and receiving test events (Sentry or equivalent)
- [ ] Source maps uploaded to error tracker
- [ ] Uptime monitoring configured with alert < 1 minute
- [ ] Alerts routed to: [email / Slack / SMS]
- [ ] Log aggregation accessible

---

## Analytics

- [ ] Pageview tracking active
- [ ] Signup event tracked and verified in analytics dashboard
- [ ] "Aha moment" action tracked (core value event)
- [ ] Paid conversion event tracked
- [ ] Analytics test event appears in dashboard (not just code added)

---

## Email

- [ ] Transactional email domain configured (SPF, DKIM, DMARC)
- [ ] Email deliverability verified (not going to spam — use mail-tester.com)
- [ ] Welcome email sends and delivers (if applicable)
- [ ] Password reset email works
- [ ] Payment confirmation email works (Stripe automatic or custom)

---

## Legal

- [ ] Privacy policy page live and linked in footer
- [ ] Terms of service page live and linked in footer
- [ ] Cookie consent banner (if targeting EU — GDPR)
- [ ] CCPA disclosure (if targeting California)
- [ ] "Delete my account" option exists in settings (required for GDPR/CCPA)
- [ ] Data you collect is described accurately in privacy policy

---

## Support

- [ ] Support email configured and actively monitored
- [ ] Support channel exists (email / Discord / Intercom / help docs)
- [ ] FAQ covers top 3 questions a new user will have
- [ ] Response time SLA defined internally (e.g., "respond within 24 hours")

---

## Security

- [ ] No secrets in source code (check git history)
- [ ] HTTP security headers configured (check with securityheaders.com)
- [ ] `npm audit` (or equivalent) shows no high or critical vulnerabilities
- [ ] Auth endpoints rate-limited
- [ ] Admin routes protected and not discoverable
- [ ] HTTPS enforced — HTTP redirects to HTTPS

---

## SEO and Discoverability (if applicable)

- [ ] `<title>` tags set on all public pages
- [ ] Meta descriptions on landing page and key pages
- [ ] Open Graph tags for social sharing (og:title, og:description, og:image)
- [ ] `robots.txt` configured
- [ ] `sitemap.xml` generated and submitted to Google Search Console
- [ ] Google Search Console verified

---

## Launch Assets (prepare before launch day)

- [ ] Product screenshots ready (1280×800 and 1:1 square versions)
- [ ] Product demo GIF or short video (optional but valuable)
- [ ] One-paragraph product description written
- [ ] Tagline finalized
- [ ] Launch post written for each chosen channel
- [ ] Social profiles updated with product link

---

## Final Sign-off

| Check | Status | Date | Sign-off |
|-------|--------|------|---------|
| Technical readiness | ⬜ | — | Operant |
| Product readiness | ⬜ | — | Royce |
| Launch assets ready | ⬜ | — | Royce |
| Launch date confirmed | ⬜ | — | Royce |

**Launch cleared:** [date]

---

*This checklist must be 100% complete before public launch. No exceptions.*
