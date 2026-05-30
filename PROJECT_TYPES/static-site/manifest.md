# Project Type: Static / Content Site (`static-site`)

## Identity
- **id:** `static-site`
- **One-liner:** A content-first site — marketing page, blog, documentation, or portfolio — primarily rendered without a dynamic backend.
- **Choose this when:** The deliverable is pages and content optimized for readers and search engines, with little or no authenticated application logic.
- **Not this if:** It's an interactive app behind login (`saas`, `internal-tool`) or a headless service (`api-service`).

## Phase Map
| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | active (full) | Identity, purpose (sell / inform / showcase), audience, content plan, success = traffic/leads/readership |
| 1 Discovery | active (full) | Audience, competitor sites, keyword/SEO research, content gaps |
| 2 Planning | active (full) | "PRD" = content map + page list; **UX is central** (prototype = the real design); static architecture; monetization optional |
| 3 Solutioning | active (full) | Backlog organized by page / section / content piece |
| 4 Implementation | active (full) | Layout/components → pages/content → SEO/meta → forms/integrations → checks → deploy |
| 5 Launch | active (full) | Publish; submit to search engines; metrics = traffic, rankings, conversions |

## Success Model
**Reach and conversion are first-class.** Success = traffic, search rankings, and the target action (signups, leads, reads, contact). For a portfolio: impressions and inbound interest.

## Default Stack
Astro / Next.js (static export) / Hugo · Markdown/MDX or a headless CMS (Sanity/Contentful) · Tailwind · Vercel/Netlify/Cloudflare Pages (CDN) · Plausible/GA for analytics.

## ADRs
- **Mandatory:** ADR-001 Static framework / generator, ADR-002 Content source (Markdown/MDX vs. headless CMS), ADR-003 Hosting/CDN, ADR-004 Analytics.
- **Optional:** Forms/newsletter integration, comments, search, i18n, image pipeline.

## Phase 2 Tracks
- **PRD:** yes — as a **content map**: every page, its purpose, target keyword, and primary CTA
- **UX + Prototype:** **yes — central.** The design *is* the product. The Prototype Sprint visual gate stays a hard gate; this site is the public face.
- **Architecture:** yes — static stack, content source, hosting/CDN, analytics
- **Monetization:** optional — ads, affiliate, lead-gen, or none. Usually skipped.

## Phase 4 Build Order
`Design system / layout & components → Pages & content → SEO & meta (titles, descriptions, OG, sitemap, robots) → Forms & integrations (analytics, newsletter) → Checks (Lighthouse, broken links, responsive) → Deploy`. No schema/migration/auth unless a specific feature needs it.

## Launch & Metrics
Deploy to CDN with custom domain + SSL. Submit `sitemap.xml` to search consoles. Metrics: traffic by source, search rankings/impressions, bounce rate, conversion on the primary CTA, Core Web Vitals.

## Gate Criteria Deltas
- **Skip:** auth/database checks (unless a feature needs them); monetization unless chosen; the monetization-milestone-order check.
- **Keep (hard):** the **prototype/visual-quality gate** — for a public content site, design quality is the deliverable, not optional.
- **Add:** SEO baseline (every page has title + meta description; OG tags on key pages; sitemap + robots present); Core Web Vitals targets; responsive at mobile/tablet/desktop.
- **Keep:** content-quality standard (no lorem ipsum / placeholders), accessibility, no-secrets-in-code.
