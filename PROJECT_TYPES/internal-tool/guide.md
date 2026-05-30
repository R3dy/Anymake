# Internal Tool — Build Guide

> **`project_type: internal-tool`** — for a web app built for a specific team or organization to replace a manual process. Success is measured in *adoption* (the team actually uses it) and *time saved / errors removed* — never in revenue. It is never sold. The quality bar is **usable and clear**, not market-grade polish: a screen that lets the ops team finish a task in two clicks beats a beautiful screen nobody on the team will adopt.

**The whole point:** take a painful spreadsheet-and-email workflow off a real team's plate, and have them switch to your tool because it's faster. Keep all the engineering discipline of SaaS — auth, authorization, tests, no secrets in code — but drop everything that exists to *sell* a product (market sizing, pricing, public launch, growth analytics, legal/ToS).

This guide is self-contained. Follow it phase by phase; consult `manifest.md` for the machine-readable spec it must agree with.

---

## Phase 0 — Foundation (full)

One focused session. Produce `PROJECTS/[name]/PROJECT.md` covering:

- **Name** — what the tool is called internally.
- **What it does** — one or two sentences describing the job it does for the team.
- **Which team** — the specific group who will use it (e.g., "the Finance ops team," "field service dispatchers"). Name the roles, not "users."
- **What it replaces** — the manual process today: the spreadsheet, the shared inbox, the copy-paste-between-two-systems ritual, the Slack thread that becomes the source of truth. Be concrete about the current pain.
- **Success looks like** — adoption + outcome, e.g., "all 8 dispatchers log assignments here instead of the shared sheet" and "closing the weekly reconciliation drops from ~4 hours to under 1, with zero transcription errors." Pick measurable time-saved / error-reduction targets.
- **Sponsor & scope** — who owns the manual process and is asking for this; an explicit in-scope / not-doing list.

Do **not** write a revenue model, pricing, or business/market metrics — there is no money axis here. The success axis is adoption and time saved.

**Gate:** `PROJECT.md` names the team, the manual process being replaced, and concrete adoption + time-saved / error-reduction targets. The proxy does **not** check for any revenue model.

---

## Phase 1 — Discovery (lite)

Lightweight, internally focused. Capture in `docs/discovery.md`:

- **Stakeholders & needs** — the people who do the work today and what each one needs from the tool. Talk to them; one paragraph per role is plenty.
- **Current workflow** — the actual steps the team follows now, end to end, including the workarounds and the parts that go wrong. A numbered walkthrough or a simple flow.
- **Constraints from the org** — which internal systems it must read from or write to, what data is sensitive, who is allowed to see what.
- **Unknowns** — anything worth a quick check before planning (e.g., "can we get read access to the HR database?").

Explicitly **skip**: TAM/SAM/SOM and any market sizing, competitor analysis, and market-timing/why-now. There is no market — there is one team. Replacing those questions with stakeholder interviews and a current-state workflow map is the whole job of this phase.

**Gate:** stakeholder needs and the current manual workflow are documented. The proxy does **not** check for market size, competitors, or timing.

---

## Phase 2 — Planning (full)

Run three tracks — PRD, UX, Architecture. **No monetization track, ever.**

**PRD** (`docs/prd.md`, full): the features the tool needs, each with clear, testable acceptance criteria. Frame requirements against the current workflow — every feature should remove a manual step or a class of error. Include the data model the work revolves around (records, statuses, owners).

**UX** (`docs/ux-design.md`): yes — this tool has screens, so design them. But the bar is **usable and clear**, not pixel-perfect or brand-led: consistent layout, obvious primary actions, sensible defaults, states for empty/loading/error, and flows that mirror how the team thinks about the work. A clickable **prototype is recommended** to validate flows with a few real users from the team before building — but it is **not a hard gate**. Do not block the phase on prototype polish.

**Architecture** (`docs/adr/`): write all five mandatory ADRs —
- **ADR-001 Frontend** (e.g., Next.js + TypeScript)
- **ADR-002 Backend**
- **ADR-003 Database** (e.g., Postgres)
- **ADR-004 Auth** — **company SSO / company identity**: Okta, Google Workspace, or Microsoft Entra. Do not build a public sign-up flow; users are provisioned through the company directory. Decide how roles/groups map from the IdP.
- **ADR-005 Hosting** — an **internal environment**: a private Vercel project, the company cloud account, or behind the VPN. Note network reachability and who can deploy.

Optional ADRs worth considering: audit logging, role-based access, integrations with internal systems, error tracking. Use Resend or the company mail relay for any notifications.

**Gate:** PRD has testable acceptance criteria; UX exists and is clear; all five mandatory ADRs are written with SSO/company auth and internal hosting decided. The proxy **relaxes** the prototype to recommended (no fail for missing/rough prototype) and **skips** all monetization checks.

---

## Phase 3 — Solutioning (full)

Turn the plan into an executable backlog using the standard structure.

- **Epics** (`docs/epics/`) grouping related capabilities — e.g., "Record management," "Assignment workflow," "Reporting," "SSO & access control."
- **Stories** (`docs/stories/`) with acceptance criteria and dependencies, sized to be built one at a time.
- **Backlog order** — sequence stories so the team's core daily task is usable as early as possible; foundational stories (schema, auth wiring) come first.

There is **no payment/monetization milestone** to sequence — that line item simply does not exist. Do keep an access-control story: who can see and do what is a real requirement for internal data.

**Gate:** epics and stories exist with quality acceptance criteria and a sensible build order. The proxy checks AC quality and ordering; it does **not** look for a payment milestone.

---

## Phase 4 — Implementation (full)

Build with the standard web layer order — the same as SaaS, minus payments:

`Schema → Migration → API → Component → Page → Integration → Test`

- **Auth via SSO / company identity** — wire ADR-004's IdP (Okta / Google Workspace / Entra). No public registration; sessions come from the company directory.
- **Keep authorization checks.** Internal data still needs protection — gate every API route and page by role/group, enforce row-level ownership where relevant, and never assume "it's internal, so it's safe." A leaked internal HR or finance dataset is still a breach.
- **Tests are required**, same as SaaS: unit/integration coverage for business logic and the acceptance criteria. The relaxed-test posture of `hobby` does **not** apply here.
- **No secrets in code** — IdP client secrets, DB URLs, and internal API keys go through environment/secret management.
- **Deploy to the internal environment** from ADR-005 (private Vercel / company cloud / behind VPN), with a staging or preview environment the team can try.
- Use the agentic orchestrator/worker/validator loop as for SaaS; the build order and gates are identical apart from the absent payment work.

**Gate:** the app builds and runs; SSO login works; authorization is enforced on protected routes; tests pass; no secrets are committed. These checks are **kept** in full — only the payment milestone is absent.

---

## Phase 5 — Internal Rollout (replaces Launch)

There is no public launch. Roll the tool out to the team and drive adoption.

- **Onboard the team** — a short walkthrough or guide, accounts provisioned via the IdP/directory, and a cutover plan from the old manual process (run in parallel briefly if the work is critical).
- **Gather feedback** — a lightweight channel (a Slack channel, a standing check-in, an in-app feedback link). Triage themes into the backlog.
- **Track adoption & time saved** — the real success metrics: active users within the target team, task completion / time-per-task vs. the old process, error-reduction, and recurring feedback themes. Compare against the Phase 0 targets.
- **Iterate** — internal tools live and grow; keep shipping fixes the team asks for.

Explicitly **skip**: public launch (no Product Hunt, no press), legal pages (no GDPR/ToS/privacy-marketing — it runs under the company's existing internal data policies), SEO, and acquisition/revenue analytics (no AARRR funnel). The only analytics that matter are internal usage and time-saved.

**Gate:** the team is onboarded and adoption / time-saved is being tracked against the Phase 0 targets. The proxy **replaces** revenue/launch metrics with adoption + time-saved, and **skips** public-launch legal, SEO, and acquisition analytics.

---

## What's different from SaaS (and why)

| Area | SaaS | Internal Tool | Why |
|------|------|---------------|-----|
| Success axis | Revenue, growth | Adoption + time saved / errors removed | It's never sold; value is the team using it and saving time |
| Phase 1 Discovery | Full: TAM/SAM/SOM, competitors, why-now | Lite: stakeholder needs + current workflow | There's one team, not a market |
| Monetization track | Required | Removed entirely | No money axis exists |
| Auth | Public sign-up | Company SSO (Okta / Google Workspace / Entra) | Users come from the corporate directory |
| Hosting | Public production | Internal environment (private Vercel / company cloud / VPN) | Only the org should reach it |
| Prototype (Phase 2) | Hard gate | Recommended, not a gate | Usable-and-clear beats market-grade polish |
| Build order | `Schema → … → Test` w/ payments | Same, minus payment milestone | No billing to build |
| Authorization & tests | Required | Required (unchanged) | Internal data still needs protection |
| No secrets in code | Required | Required (unchanged) | Same security baseline |
| Phase 5 | Public launch, legal, SEO, AARRR | Internal rollout: onboard, feedback, adoption | Nothing ships to the public |

If this tool ever needs to be sold outside the company, that's the signal it has outgrown `internal-tool` — switch `project_type` to `saas` and the monetization, market, and public-launch phases activate.
