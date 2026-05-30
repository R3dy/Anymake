---
name: anymake-design-system
description: Use to hit Anymake's visual-quality bar for user-facing products — build the design system and the Phase 2 Prototype Sprint, and audit a UI against the prototype gate ("looks like it was built by a funded company, not a tutorial"). Triggers on "design system", "prototype sprint", "make it look polished", "UI/visual quality", "design tokens", "audit the UI", or Anymake Phase 2 Step 2.2. Applies to types whose manifest marks UX+Prototype active (saas, internal-tool, static-site); headless types skip it.
---

# Anymake Design System — Visual Quality & Prototype

Anymake treats visual quality as first-class for anything with screens shown to
others. This skill owns that bar: it produces the **design system** and the
**Prototype Sprint**, and it runs the **prototype gate** audit. The hub invokes
it at Phase 2, Step 2.2 / 2.2b.

## When to use

- Hub **Phase 2, Step 2.2b (Prototype Sprint)** — for types whose `manifest.md` marks UX+Prototype active. (Step 2.2 produces the flows/wireframes the system styles.)
- Directly — "build a design system", "make this look polished", "does this pass
  the prototype gate?".

## Applicability (check the manifest first)

Read `PROJECT_TYPES/<id>/manifest.md` → **Phase 2 Tracks**.

| Types | Behavior |
|-------|----------|
| `saas`, `internal-tool` | Full design system + prototype. (Internal-tool may relax polish per its manifest.) |
| `static-site` | Full — visual quality *is* the product. |
| `hobby` | Lite or skipped per manifest. |
| `cli`, `library`, `api-service` | **Skip** — headless. (For CLI, "UX" = help text / output formatting, not visuals.) |

## Part 1 — Design system

Read `TEMPLATES/ux-design.md` and produce a concrete, reusable system, not
adjectives:

1. **Foundations:** color palette (with semantic roles + accessible contrast),
   type scale, spacing scale, radius, elevation/shadow, iconography.
2. **Tokens:** name every foundation as a token so implementation is consistent.
3. **Components:** the core set the product needs (buttons, inputs, nav, cards,
   tables, modals, empty/loading/error states) with states defined.
4. **Patterns & layout:** grid, responsive behavior, the key page templates.
5. **Voice:** microcopy tone, empty-state and error messaging style.

## Part 2 — Prototype Sprint

A polished, realistic visual prototype of the **critical path** — before any
production code.

1. Build the 2–4 screens that carry the core journey, using the design system.
2. Use realistic content (no "lorem ipsum", no placeholder gray boxes).
3. Cover real states: populated, empty, loading, error.
4. Make it look shippable, not wireframe.

## Part 3 — The prototype gate

The product does not pass Phase 2 until the prototype clears this bar:

- [ ] Would you be **proud to show it to a potential customer**? (The hard gate.)
- [ ] Looks like a funded company built it — not a tutorial or admin template.
- [ ] Visually consistent — every screen uses the same tokens/components.
- [ ] Real content and real states, not placeholders.
- [ ] Accessible: contrast passes, focus states visible, hit targets adequate.
- [ ] Responsive across the target breakpoints.
- [ ] Nothing generic/default-framework-looking is left in the critical path.

Fail any box → it does not pass. In autonomous mode the Product Owner Proxy
applies this gate; otherwise the user does.

## Guardrails

- **Generic is unacceptable.** Default component-library looks, unstyled forms,
  and placeholder content all fail the gate.
- **System before screens.** Build tokens/components first so the prototype is
  consistent and the eventual build inherits it.
- **Respect the manifest.** Don't impose the visual bar on a headless type, and
  don't skip it on a type that requires it.
