# Static / Content Site — Build Guide

> **`project_type: static-site`** — for a content-first site: marketing page, blog, documentation, or portfolio. Here reach and conversion are the whole game: the **design is the product**, content quality and SEO matter more than any feature, and the public face must look finished. There is little or no authenticated app logic — you are shipping pages and words, optimized for readers and search engines.

**The whole point:** get the right content in front of the right people and move them to one action. Every phase below bends toward traffic, rankings, and the primary CTA — not toward backends, schemas, or login.

---

## Phase 0 — Foundation (full)

One focused session. Produce `PROJECTS/[name]/PROJECT.md` covering:

- **Name & identity** — what the site is and the impression it should leave (authoritative? playful? premium?).
- **Purpose** — pick the dominant one: **sell** (marketing/lead-gen), **inform** (blog/docs), or **showcase** (portfolio). This choice colors every later decision.
- **Audience** — who you're writing for, what they already know, what they're trying to do when they land.
- **Content plan** — the rough shape of what you'll publish: page types, topics, cadence (one-time marketing site vs. ongoing blog/docs).
- **Success** — concrete and reach-oriented: monthly traffic, qualified leads, newsletter signups, readership, or inbound interest for a portfolio. Name the **primary CTA** the whole site optimizes toward (book a demo, subscribe, contact, read more).

Skip: pricing tiers, billing model, team org chart. (Monetization, if any, is decided later in Phase 2 and is usually skipped entirely.)

**Gate:** Purpose, audience, and the single success metric + primary CTA are filled in. In autonomous mode the proxy checks that `PROJECT.md` names a purpose and a measurable reach/conversion goal.

---

## Phase 1 — Discovery (full)

This is real research — for a content site, discovery *is* your competitive edge. Capture it in `docs/discovery.md`:

- **Audience** — sharpen Phase 0 into 1–2 reader profiles: their search intent, objections, and what would make them act.
- **Competitor sites** — the 3–6 sites that already rank for or own your space. Note their structure, content depth, design quality, and the CTAs they push. You are benchmarking against the best-looking result on page one.
- **Keyword / SEO research** — the queries your audience actually types, grouped by intent (informational vs. transactional). Pick the head terms each key page will target and a longer-tail set for blog/docs pieces.
- **Content gaps** — questions competitors answer poorly or not at all. These become your highest-leverage pages.

No TAM modeling or risk register. The deliverable is a keyword-to-page mapping and a gap list that feeds straight into the content map.

**Gate:** Audience, competitors, target keywords, and at least one content gap are documented. Proxy checks discovery is non-empty and ties keywords to intended pages.

---

## Phase 2 — Planning (full)

Three tracks run; monetization is usually skipped. UX is **central** here — more than in any other type.

### PRD = Content Map
The "PRD" for a static site is a **content map**, not a feature spec. List **every page** with four columns:

| Page | Purpose | Target keyword | Primary CTA |
|------|---------|----------------|-------------|
| `/` Home | Convert cold visitors | "<head term>" | Book a demo |
| `/blog/<slug>` | Rank + educate | "<long-tail>" | Subscribe |
| `/docs/<topic>` | Reduce support load | "<how-to query>" | Next page / contact |

Every page must justify its existence by purpose, the keyword it targets, and the action it drives. No orphan pages.

### UX + Prototype (the real design)
The prototype **is** the site — there's no app behind it to hide an ugly skin. Produce the actual visual design: typography scale, color system, layout grid, hero treatment, and the look of each page template (home, post, doc, listing). The **Prototype Sprint visual gate stays HARD.** A content site that looks unfinished has failed regardless of how good the copy is.

### Architecture (the 4 mandatory ADRs)
Record in `docs/adr/`:
- **ADR-001 Static framework / generator** — Astro, Next.js (static export), or Hugo. Default to Astro for content-heavy sites unless you have a reason.
- **ADR-002 Content source** — Markdown/MDX in-repo (simplest, dev-friendly) vs. a headless CMS (Sanity/Contentful) when non-technical editors will publish.
- **ADR-003 Hosting / CDN** — Vercel / Netlify / Cloudflare Pages. Edge delivery + automatic SSL.
- **ADR-004 Analytics** — Plausible (privacy-friendly) or GA. This is how you'll measure success, so decide it now.

Optional ADRs only if needed: forms/newsletter integration, comments, on-site search, i18n, image pipeline.

### Monetization (optional, usually skipped)
Only if the site earns directly: ads, affiliate, or lead-gen. Most marketing sites, docs, and portfolios skip this entirely — the value is the downstream action, not on-page revenue.

**Gate:** Content map complete (every page has purpose + keyword + CTA), the **visual prototype passes the hard quality gate**, and all four mandatory ADRs are recorded. Proxy enforces the prototype gate and the four ADRs; it does **not** require a monetization or database decision.

---

## Phase 3 — Solutioning (full)

Turn the content map into a backlog in `docs/backlog.md`, **organized by page / section / content piece** rather than by technical layer:

- One work item per page or content piece (e.g., "Home hero + value props," "Pricing section," "Blog post: <title>," "Docs: getting started").
- Group items into sections (Global/layout, Marketing pages, Blog, Docs, Portfolio entries).
- Each item carries its acceptance notes from the content map: the keyword it targets, the CTA it must contain, and "done = real, final copy" (not a placeholder).
- Order items so shared layout/components land first, then high-value pages, then the long tail of content.

**Gate:** Backlog is non-empty, ordered, and every item maps back to a page in the content map. Proxy checks coverage — no content-map page is missing a backlog item.

---

## Phase 4 — Implementation (full)

Build in **exactly this order** (overrides the SaaS Schema→API→… order):

`Design system / layout & components → Pages & content → SEO & meta → Forms & integrations → Checks → Deploy`

1. **Design system / layout & components** — implement the prototype: tokens (type, color, spacing), the page shell (header, nav, footer), and reusable components (hero, card, prose/content block, CTA button).
2. **Pages & content** — build each page from the backlog and fill it with **real, final content**. The content-quality standard is firm: **zero lorem ipsum, zero placeholder copy, no broken/dummy images** ship past this step.
3. **SEO & meta** — per page: unique `<title>` and meta description; Open Graph + Twitter cards on key pages; structured `sitemap.xml`; `robots.txt`; canonical URLs; semantic headings.
4. **Forms & integrations** — wire up analytics (per ADR-004), and any newsletter/contact form or other chosen integration. Forms post to a service, not a database.
5. **Checks** — run **Lighthouse** (performance/SEO/accessibility), a **broken-link** scan, and **responsive** verification at mobile / tablet / desktop. Fix before deploy.
6. **Deploy** — push to the CDN (per ADR-003).

**No schema, migration, API, or auth layers** unless a specific feature genuinely needs one (e.g., a gated download). Don't invent a backend for a content site.

**Gate:** The site builds and deploys to a preview; every page has real content + SEO meta; Lighthouse SEO/performance pass the targets; no broken links; responsive holds at all three breakpoints; no secrets in code. Proxy **skips** auth/database checks and enforces the SEO baseline, Core Web Vitals targets, responsive, content-quality, and accessibility.

---

## Phase 5 — Launch (full)

Go public and start measuring reach.

- **Publish** to the CDN on the **custom domain with SSL** — verify the production domain, not just the `*.vercel.app` preview.
- **Submit `sitemap.xml`** to Google Search Console and Bing Webmaster Tools; confirm `robots.txt` allows indexing (a common launch-day miss: shipping with `noindex` still on).
- **Confirm analytics** is firing on production and the primary-CTA conversion event is tracked.
- **Set up the metrics framework** (replaces SaaS AARRR) in `docs/metrics.md`:
  - **Traffic by source** (organic / direct / referral / social)
  - **Search rankings & impressions** (from Search Console)
  - **Bounce rate** / engagement
  - **Conversion on the primary CTA**
  - **Core Web Vitals** (LCP, INP, CLS) from field data

No legal/billing infrastructure unless monetization was chosen.

**Gate:** Live on the custom domain with SSL, sitemap submitted and indexing allowed, analytics confirmed on production, and Core Web Vitals within target in the field. Proxy checks the domain/SSL, sitemap submission, indexing, and analytics; it does **not** require billing or auth.

---

## What's different from SaaS (and why)

| Area | SaaS baseline | Static-site change | Why |
|------|---------------|--------------------|-----|
| Success model | Revenue (AARRR funnel) | Reach + conversion: traffic, rankings, primary-CTA | The endpoint is an audience and an action, not subscriptions |
| Phase 2 "PRD" | Feature spec with stories | **Content map**: page × purpose × keyword × CTA | The product is pages and words, not features |
| Prototype gate | Hard gate | **Stays hard** | The design *is* the public deliverable — even more so here |
| Architecture | DB, API, auth, multi-tenant | Generator + content source + CDN + analytics (4 ADRs) | No dynamic backend to design |
| Build order | Schema → Migration → API → Component → Page → Integration → Test | Layout/components → Pages/content → SEO/meta → Forms/integrations → Checks → Deploy | Content and SEO are the work; no data layer |
| Backlog shape | Epics → stories by capability | Items by **page / section / content piece** | Maps to the content map, not to features |
| New gate checks | — | SEO baseline, Core Web Vitals, responsive at 3 breakpoints | Search visibility and polish *are* the quality bar |
| Skipped checks | — | Auth/database, monetization & milestone-order | No login, no backend, usually no on-page revenue |
| Launch | Billing live, legal pages, monitoring | Custom domain + SSL, sitemap submission, analytics + CWV | Distribution is search + direct, not signups |
