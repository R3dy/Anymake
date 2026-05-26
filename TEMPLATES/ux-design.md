# UX Design — Template

Copy to `docs/02-planning/ux-design.md` for your project.

---

# [Project Name] — UX Design

**Version:** 1.0
**Date:** [date]
**Status:** Draft | Approved

---

## Design DNA

**This section comes first. Lock it before choosing components or writing wireframes. Design DNA is what separates a product that looks like a tutorial from one that looks like a funded SaaS company.**

### Visual Direction

Pick one archetype and commit. Every subsequent decision flows from this.

| Archetype | Aesthetic | Reference products |
|-----------|-----------|-------------------|
| `minimal-clean` | White space, thin borders, subtle shadows. Confidence through restraint. | Linear, Vercel, Raycast, Railway |
| `bold-expressive` | Strong colors, high contrast, confident typography. Power user energy. | Stripe, Lemon Squeezy, Clerk |
| `dark-dramatic` | Dark backgrounds, glowing accents, depth and layering. Premium feel. | Planetscale, Supabase, Resend |
| `warm-approachable` | Rounded corners, friendly palette, generous padding. Welcoming. | Loom, Notion, Superhuman |

**This product's visual direction:** `[archetype]`

**Reference products:** [Name 2-3 real products with this aesthetic — e.g., "Linear, Vercel, Railway"]

**One-sentence product personality:** [e.g., "Precise and fast, like a professional tool that respects your time"]

---

### Brand Color Palette

Do not use the default Tailwind blue. Choose a brand color that matches the product's personality.

| Token | Hex | Role |
|-------|-----|------|
| `brand-50` | `#[hex]` | Background tint, badges, subtle fills |
| `brand-100` | `#[hex]` | Hover background on ghost elements |
| `brand-500` | `#[hex]` | **Primary accent** — buttons, active states, links |
| `brand-600` | `#[hex]` | Hover state on primary elements |
| `brand-700` | `#[hex]` | Pressed/active state |
| `neutral-950` | `#[hex]` | Primary text (near-black) |
| `neutral-700` | `#[hex]` | Secondary text |
| `neutral-400` | `#[hex]` | Placeholder, disabled, captions |
| `neutral-200` | `#[hex]` | Borders, dividers |
| `neutral-100` | `#[hex]` | Subtle backgrounds, hover fills |
| `neutral-50` | `#[hex]` | Page background |

**Accent gradient:** `linear-gradient(135deg, [brand-500] 0%, [complementary color] 100%)` — used sparingly on hero sections and key CTAs.

---

### Typography

Pick fonts that reinforce the visual direction. Never default to system-ui for headings.

| Role | Font family | Weight | Where |
|------|------------|--------|-------|
| Display / Hero | [e.g., "Cal Sans" \| "Bricolage Grotesque" \| "Plus Jakarta Sans"] | 700-800 | H1, hero headlines |
| Heading | [e.g., "Inter" \| "DM Sans" \| "Geist"] | 600 | H2-H4, section titles |
| Body | [e.g., "Inter" \| "DM Sans"] | 400 | Paragraphs, UI text |
| Mono | [e.g., "Geist Mono" \| "JetBrains Mono"] | 400 | Code, IDs, technical values |

**Font source:** [Google Fonts CDN | Fontsource npm package | Next.js font optimization]

**Type scale:**
| Level | Size | Weight | Line height | Letter spacing |
|-------|------|--------|-------------|----------------|
| Hero | 56-72px | 700 | 1.1 | -0.02em |
| H1 | 36-48px | 700 | 1.2 | -0.02em |
| H2 | 24-30px | 600 | 1.3 | -0.01em |
| H3 | 18-20px | 600 | 1.4 | 0 |
| Body | 16px | 400 | 1.6 | 0 |
| Small | 14px | 400 | 1.5 | 0 |
| Caption | 12px | 500 | 1.4 | 0.02em |

---

### Surface and Depth System

Defines how layers feel. Inconsistency here is what makes products look cheap.

**Depth style:** [`flat` | `subtle` | `layered` | `glassmorphism`]

| Surface level | CSS | Use |
|--------------|-----|-----|
| Page background | `bg-neutral-50` or `bg-white` | Base layer |
| Card / Panel | `bg-white shadow-sm border border-neutral-200/80` | Primary content surfaces |
| Elevated card | `bg-white shadow-md` | Dropdowns, popovers, hover cards |
| Modal | `bg-white shadow-xl ring-1 ring-neutral-900/5` | Dialogs |
| Tooltip | `bg-neutral-900 text-white` | Tooltips |

**Border radius system:** Pick one default and use it everywhere.
- `rounded-lg` (8px) — professional, modern (recommended for most products)
- `rounded-xl` (12px) — friendly, approachable
- `rounded-2xl` (16px) — very rounded, consumer-app feel
- `rounded-md` (6px) — tighter, more utilitarian

**Spacing philosophy:** Generous. Use more padding than you think you need. Cramped = low quality.

---

### Hero Section Treatment

The first thing users see. This is where "generic tutorial" vs. "real product" is decided.

**Treatment:** [`mesh-gradient` | `radial-glow` | `geometric-pattern` | `image-backed` | `minimal-clean`]

| Treatment | Implementation | Best for |
|-----------|---------------|---------|
| `mesh-gradient` | CSS conic/radial layered gradients at low opacity | Bold, expressive products |
| `radial-glow` | `radial-gradient(ellipse at top, [brand-50] 0%, transparent 70%)` | Most SaaS products |
| `geometric-pattern` | SVG dot grid or line grid + brand color overlay | Technical/developer tools |
| `minimal-clean` | White or near-white, strong typography does the work | Premium minimal products |

**This product's hero treatment:** `[treatment]`

---

### Motion Design

Define the animation personality before any code is written.

**Animation level:** [`none` | `subtle` | `standard` | `expressive`]

| Level | Description | Best for |
|-------|-------------|---------|
| `none` | No transitions beyond browser defaults | Data-heavy tools, accessibility-first |
| `subtle` | 150ms ease-out fades and scales on interaction only | Professional tools, dashboards |
| `standard` | 200ms transitions, entrance animations on key elements | Most SaaS products |
| `expressive` | 300-500ms, spring physics, staggered lists, page transitions | Consumer apps, marketing-heavy |

**Animation library:** [Framer Motion | CSS transitions only | auto-animate]

**Standard timing:**
| Element | Duration | Easing |
|---------|----------|--------|
| Hover state | 100ms | ease |
| Component enter | 200ms | ease-out |
| Modal open | 150ms | ease-out |
| Page transition | 300ms | ease-in-out |
| Stagger children | 50ms delay between items | ease-out |

**Required transitions for all products:**
- All buttons: `transition-all duration-150` — color, shadow, transform on hover
- All cards (if clickable): `hover:shadow-md hover:-translate-y-0.5 transition-all duration-150`
- All inputs: `transition-colors duration-100` — border and ring color
- Modals: fade + scale from 95% → 100% on open

---

### Content Quality Standard

**This is non-negotiable.** Every demo, empty state, and placeholder must be realistic.

| ❌ Never | ✅ Always |
|----------|----------|
| "Lorem ipsum dolor sit amet" | Real product copy written for this product |
| "User 1", "Test Item", "Example" | Realistic names: "Sarah Chen", "Q4 Revenue Report" |
| `$0.00`, `0 items`, all zeros | Realistic numbers: `$2,847.50`, `143 items`, `87%` |
| "Loading..." text in skeletons | Shape-only skeleton with shimmer animation |
| Generic placeholder images | Branded gradient or product-relevant illustration |
| "Click here to get started" | Action-specific copy: "Create your first project" |

**Rule:** If someone screenshots this prototype and posts it on Twitter saying it's a real product, people should believe them.

---

## Design System

**Component library:** [shadcn/ui | Radix UI | MUI | Headless UI | Chakra | custom]

**Styling:** [Tailwind CSS | CSS Modules | styled-components | vanilla CSS]

**Icon set:** [Lucide | Heroicons | Phosphor | Radix Icons]

**Rationale:** [One sentence on why this combination — e.g., "shadcn/ui + Tailwind gives us production-quality components without a design constraint"]

### Visual Tokens

These are the decisions that make the product feel consistent. Lock them in Phase 2.

**Color palette:**
| Token | Value | Use |
|-------|-------|-----|
| `primary` | `#[hex]` | CTAs, links, interactive elements |
| `primary-foreground` | `#[hex]` | Text on primary background |
| `destructive` | `#[hex]` | Delete actions, error states |
| `muted` | `#[hex]` | Secondary text, placeholders, disabled |
| `background` | `#[hex]` | Page background |
| `card` | `#[hex]` | Card / surface background |
| `border` | `#[hex]` | Input borders, dividers |

If using shadcn/ui, the token system is pre-defined — just choose light/dark mode and accent color.

**Typography:**
| Element | Font | Size | Weight | Line height |
|---------|------|------|--------|------------|
| Heading 1 | [font] | [size] | [weight] | [lh] |
| Heading 2 | [font] | [size] | [weight] | [lh] |
| Body | [font] | 16px | 400 | 1.5 |
| Small / caption | [font] | 14px | 400 | 1.4 |
| Code | [mono font] | 14px | 400 | 1.6 |

**Spacing scale:** [Tailwind default (4px base) | 8px base | custom]

**Border radius:** [none | sm (4px) | md (8px) | lg (12px) | full (pill)] — pick one system-wide default

---

## Component Inventory

List every reusable component that needs to be built. Group by complexity.

**Foundation (use from component library — customize as needed):**
- Button (primary / secondary / destructive / ghost / link variants)
- Input, Textarea, Select, Checkbox, Radio
- Badge / Tag
- Avatar
- Tooltip
- Dropdown menu
- Dialog / Modal
- Sheet (drawer)
- Toast / Notification
- Tabs
- Table
- Skeleton loader

**Product-specific components (build custom):**
- `[ProductName]Card` — [what it shows, where it's used]
- `[FeatureName]Form` — [fields, validation, submission]
- `[DataView]Table` — [columns, sorting, pagination behavior]
- `UpgradePrompt` — [inline banner shown to free users at limits]
- `PlanBadge` — [shows current subscription tier]
- `EmptyState` — [reusable empty state with illustration, message, CTA]
- [Add others specific to this product]

**Layout components:**
- `AppShell` — authenticated layout (nav + content area)
- `PublicLayout` — public pages (header + footer)
- `PageHeader` — page title + action button pattern
- `FormSection` — grouped form fields with label and help text

---

## Interactive States

Every interactive element needs all states defined. If not specified, developers pick inconsistently.

**Button states:**
| State | Visual |
|-------|--------|
| Default | [description — e.g., "primary blue, white text"] |
| Hover | [e.g., "slightly darker bg, cursor: pointer"] |
| Focus | [e.g., "2px ring in primary color, offset 2px"] |
| Active | [e.g., "slightly depressed, darker than hover"] |
| Disabled | [e.g., "50% opacity, cursor: not-allowed"] |
| Loading | [e.g., "spinner replaces text, same size, disabled"] |

**Input states:**
| State | Visual |
|-------|--------|
| Default | [e.g., "neutral border"] |
| Focus | [e.g., "primary color border, no box shadow"] |
| Error | [e.g., "red border, error message below"] |
| Disabled | [e.g., "gray bg, not-allowed cursor"] |
| Read-only | [e.g., "no border, lighter bg"] |

**Link states:** [underline on hover | always underlined | color change only]

---

## Loading States

Every data-dependent view needs a loading state. Specify skeleton vs spinner per component.

**Rule of thumb:**
- Use **skeleton screens** for layouts that have known shape (lists, cards, tables)
- Use **spinners** for actions (form submit, button click, file upload)
- Use **nothing** (instant) for cached data or optimistic updates

| Component | Loading behavior | Notes |
|-----------|----------------|-------|
| Dashboard (initial load) | Skeleton — 3 stat cards + 5 table rows | |
| [Feature list] | Skeleton — N rows | |
| Form submit button | Inline spinner, button disabled | Keep button same width |
| File upload | Progress bar | Show % if large file |
| Search results | Skeleton OR previous results + spinner | Decide: stale vs blank |
| [Any other data view] | [skeleton / spinner / optimistic] | |

**Skeleton spec:**
- Animate with shimmer (CSS pulse or gradient sweep)
- Match approximate shape of real content
- Never show actual placeholder text ("Loading...") in skeleton — shapes only

---

## Responsive Layout

**Breakpoints:**
| Name | Width | Target devices |
|------|-------|---------------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptop |
| `xl` | 1280px | Desktop |

**Mobile-first. These elements change at breakpoints:**

| Element | Mobile (< 768px) | Tablet (768px+) | Desktop (1024px+) |
|---------|-----------------|-----------------|------------------|
| Navigation | Hamburger menu → full-screen drawer | [same as mobile OR tabs] | Horizontal nav bar |
| Dashboard stats | Single column stack | 2-column grid | 3-column grid |
| [Feature table] | Horizontal scroll OR card list | Full table | Full table |
| Sidebar (if any) | Hidden, accessible via toggle | Collapsible | Always visible |
| [Form] | Single column | [same] | 2-column on wide forms |
| Pricing cards | Vertical stack | 2-across | 3-across |

**Navigation collapse behavior (mobile):**
- Trigger: hamburger icon at [left | right] of header
- Menu: [full-screen overlay | side drawer | dropdown]
- Close: X button, backdrop tap, or navigation
- Authenticated items visible: [list them]

---

## Form Behavior

Inconsistent form UX is one of the most common frontend bugs. Specify it explicitly.

**Validation timing:**
| Form type | When validation fires |
|----------|----------------------|
| Login / Signup | On submit only (not while typing) |
| Settings / Profile | On blur (when field loses focus) |
| Search / Filter | On change (real-time, debounced 300ms) |
| [Any other form] | [on blur | on submit | on change] |

**Error message placement:**
- Inline, below each field — not a summary at the top
- Red text, 14px, same width as the field
- Appears after validation fires (not before user has typed)
- Clears as soon as the field is valid again

**Submission behavior:**
1. User clicks submit
2. Client-side validation runs — if errors: show inline errors, focus first error field, do not submit
3. Button goes into loading state (spinner, disabled)
4. API call made
5. Success: [redirect / toast / inline success message]
6. Error: button resets, [toast with error message | inline error above form]

**Required field indicator:** [asterisk (*) | "Required" label | no indicator — all required unless marked Optional]

---

## Overlays and Modals

**Dialog (modal):**
- Opens: [button click / specific trigger]
- Closes: Escape key, X button, backdrop click (configure per dialog — destructive confirmations should NOT close on backdrop)
- Focus: Traps focus inside when open, returns to trigger on close
- Size: [sm (448px) | md (512px) | lg (672px)] — pick defaults
- Scroll: Content scrolls inside modal if taller than viewport

**Sheet / Drawer:**
- Side: [right | bottom] — specify per use case
- Closes: Escape, X button, backdrop click
- Use for: [forms, filters, detail views] — not confirmations

**Destructive confirmation pattern:**
```
User clicks "Delete [X]"
  ↓
Confirmation dialog: "Delete [X]? This cannot be undone."
Buttons: [Cancel] [Delete] — Delete is destructive red, focused by default? No — Cancel focused
User must explicitly click Delete
  ↓
Dialog closes, deletion proceeds, item removed with brief animation
```

---

## Notifications and Toasts

**Toast position:** [top-right | top-center | bottom-right | bottom-center] — pick one

**Toast behavior:**
| Type | Duration | Icon | Style |
|------|---------|------|-------|
| Success | 4 seconds | ✓ | Green accent |
| Error | 8 seconds (or manual dismiss) | ✗ | Red accent |
| Info | 5 seconds | ℹ | Neutral |
| Warning | 6 seconds | ⚠ | Amber accent |

**Stacking:** Show max [3] toasts at once. New ones push oldest off.

**When to use toast vs inline feedback:**
- Toast: for background operations (save, delete, send) that don't block the UI
- Inline: for form errors, empty states, and anything in the current view

---

## URL and Routing State

What lives in the URL vs component state determines back-button behavior and shareability.

| Feature | URL state (query params) | Component state only |
|---------|-------------------------|---------------------|
| Search query | `?q=[query]` | — |
| Active filter | `?filter=[value]` | — |
| Selected tab | `?tab=[name]` | — |
| Modal open | — | Local state |
| Hover states | — | Local state |
| Pagination | `?page=[n]` (if sharable) | Local state (if not) |
| Sort order | `?sort=[field]&dir=[asc/desc]` | Local (if not sharable) |

**Back button behavior:**
- Navigating back from a detail page returns to the list at the same scroll position: [Yes / No]
- Navigating back from a modal closes the modal: [Yes (URL-based) / No (state-based)]

---

## Accessibility Requirements

Accessibility is a build requirement, not a QA concern. Define it here.

**Target:** [WCAG 2.1 AA] — standard for most commercial products

**Keyboard navigation:**
- All interactive elements reachable via Tab key
- Logical tab order follows visual order
- Focus indicator always visible (never `outline: none` without replacement)
- Modals and dropdowns trap focus appropriately
- Forms can be fully completed without a mouse

**Screen reader:**
- All images have `alt` text (decorative images use `alt=""`)
- Icon-only buttons have `aria-label` (e.g., close button, icon-only nav items)
- Form inputs have associated `<label>` elements
- Error messages are `role="alert"` so they're announced immediately
- Loading states use `aria-busy` or `aria-live` regions

**Color contrast:**
- Body text: minimum 4.5:1 contrast ratio against background
- Large text / UI components: minimum 3:1
- Never rely on color alone to convey information (use icon + color)

**Motion:**
- Respect `prefers-reduced-motion` — disable or reduce animations when set
- No content flashes more than 3 times per second

---

## Animations and Transitions

Specify what animates, or explicitly say "no animations."

**Approach:** [Minimal / Standard / Expressive] — pick one and commit

| Element | Animation | Duration | Easing |
|---------|-----------|---------|--------|
| Page transition | [fade | slide | none] | [200ms] | [ease-out] |
| Modal open/close | Fade + scale (from 95% to 100%) | 150ms | ease-out |
| Toast appear | Slide in from [right/top] | 200ms | spring |
| Dropdown open | Fade + slight slide down | 100ms | ease-out |
| Button loading | Opacity transition to spinner | 100ms | ease |
| [Data list] sort/filter | [animate items? fade? none?] | — | — |

If `prefers-reduced-motion` is set: fade only, no transforms.

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

Loading: [skeleton on dashboard while data loads]

Error paths:
  → OAuth fails: "We couldn't sign you in. Try again?" [Retry button]
  → Email already exists: "You already have an account. Sign in instead."
```

---

### Flow 2: [Core Feature]

```
Entry: [Dashboard / Nav item]
  ↓
[Step 1]
  ↓  (loading state: [skeleton | spinner])
[Step 2]
  ↓
Success: [What the user sees — toast? redirect? inline update?]

Error paths:
  → [Error condition]: [User message + recovery action]
```

---

### Flow 3: Upgrade Flow (required)

```
Trigger A — Limit hit: [Limit message] + [Upgrade CTA]
Trigger B — Proactive: Nav → Upgrade link
  ↓
Pricing page (Monthly/Annual toggle)
  ↓
User selects plan → Stripe Checkout (pre-filled email)
  ↓
Payment succeeds → redirect back to app
  ↓
Success: Toast "Welcome to [Plan]! Your limits have been removed."

Error path:
  Payment fails → "Payment didn't go through. Check your card details."
  [Update payment method button]
```

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

---

## Key Screen Wireframes

### Landing Page

```
┌──────────────────────────────────────────────┐
│ [Logo]    [Features] [Pricing] [Sign in]  [Get started →] │
├──────────────────────────────────────────────┤
│           [Hero headline]                   │
│        [Sub-headline — 1 sentence]          │
│    [Primary CTA]       [Secondary CTA]      │
│    [Social proof]                           │
├──────────────────────────────────────────────┤
│  [Feature 1]    [Feature 2]    [Feature 3]  │
│  [icon+title]   [icon+title]   [icon+title] │
│  [2-line desc]  [2-line desc]  [2-line desc]│
└──────────────────────────────────────────────┘
Mobile: Nav collapses to hamburger. Features stack vertically.
```

### Dashboard (Logged In)

```
┌──────────────────────────────────────────────┐
│ [Logo]   [Nav items]              [Avatar ▼] │
├──────────────────────────────────────────────┤
│ [Page title]                [+ New / Action] │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │ Stat 1   │  │ Stat 2   │  │ Stat 3   │   │
│ └──────────┘  └──────────┘  └──────────┘   │
│ [Primary data list / table / feed]          │
└──────────────────────────────────────────────┘
Mobile: Stats stack 1-column. Table horizontal-scrolls or becomes cards.
Loading: Skeleton — 3 stat cards + 5 list rows with shimmer animation.
```

### Pricing Page

```
┌──────────────────────────────────────────────┐
│             "Choose your plan"               │
│           [Monthly | Annual] toggle          │
│ ┌──────────┐  ┌────────────┐  ┌──────────┐ │
│ │  Free    │  │  Pro  ★    │  │ Business │ │
│ │  $0/mo   │  │  $X/mo     │  │  $XX/mo  │ │
│ │ ✓ Feat A │  │ ✓ Feat A   │  │ ✓ All    │ │
│ │[Get Free]│  │ [Get Pro]  │  │[Contact] │ │
│ └──────────┘  └────────────┘  └──────────┘ │
└──────────────────────────────────────────────┘
Mobile: Cards stack vertically, most popular shown first.
```

---

## Empty and Error States

### Empty States

| Screen | Message | Primary CTA |
|--------|---------|------------|
| Dashboard — no data | "You haven't [done X] yet." | "Create your first [X]" |
| [Feature] — no results | "[Helpful, specific context]" | "[Relevant action]" |
| Search — no results | "No results for '[query]'" | "Clear search" |

### Error States

| Error | User-facing message | Recovery |
|-------|--------------------|---------  |
| Auth failure | "We couldn't sign you in. Try again?" | Retry button |
| Generic API error | "Something went wrong. We're looking into it." | Retry / Reload |
| Form validation | [Inline, specific — below each field] | Fix and resubmit |
| Payment failed | "Payment didn't go through. Check your card details." | Update payment |
| Free limit hit | "You've reached your [free] limit. Upgrade to continue." | Upgrade CTA |
| Network offline | "You appear to be offline." | Auto-retry on reconnect |
| Session expired | "Your session expired. Sign in to continue." | Redirect to login |
| 404 | "This page doesn't exist." | Go to dashboard |

---

*UX Design locked at Phase 2 gate. Changes during Phase 4 require your approval.*
