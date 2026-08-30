# ADR 002: UI System — Nuxt UI v4 (4.11.0) + Tailwind CSS 4

## Status

Accepted

## Context

The UI system must serve three masters at once:

1. **A small team shipping fast.** The storefront, checkout, account, and admin surfaces need accessible modals, dropdowns, tables, forms, toasts, and tooltips. Hand-rolling these (with correct focus management, ARIA, and keyboard behavior) is not a good use of a solo maintainer's time.
2. **A token-driven brand.** EventHub's visual identity — coral `#F05537` (Eventbrite-like energy), light/dark dual themes, a rounded 0.75rem language — must be expressed declaratively through design tokens. Rebranding or adding a theme must be a palette edit, not a hunt through component overrides.
3. **Backend-shaped components.** The UI repeatedly renders backend semantics: status badges for event/reservation enums, forms that mirror auth constraints (password min 8, confirm_pass), tables driven by the pagination envelope `{items, total, offset, limit}`. The component library must make these patterns cheap.

Two additional constraints shaped the choice:

- **Tailwind CSS 4 is the current major** (CSS-first `@theme` configuration replacing `tailwind.config.js`), and **Nuxt UI v4 is built on it** — the two are versioned as a pair; adopting one means adopting the other.
- **The theming chain must be debuggable.** In practice we already hit a silent failure where `primary` resolved to an empty CSS variable and buttons rendered uncolored (root cause documented in ADR 004). A UI system with an opaque theming pipeline would have made that diagnosis impossible.

We evaluated **Nuxt UI v4**, **PrimeVue**, **Vuetify**, **shadcn-vue (Radix Vue)**, and **plain Tailwind with headless primitives**.

## Decision

We will use **Nuxt UI v4 (4.11.0) on top of Tailwind CSS 4** as the exclusive UI system.

Rules that accompany this decision:

- Components come from Nuxt UI (`UButton`, `UModal`, `UTable`, `UForm`, ...); no second component library is introduced alongside it.
- Components reference colors **only through semantic slots** (`primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`); raw palette values inside templates are banned. The mapping `primary=brand`, `secondary=teal`, `neutral=stone` is set once (ADR 003/004).
- Design tokens live in exactly two places: `app/app.config.ts` (`ui.colors` semantic mapping) and `app/assets/css/main.css` (`@theme static` emission of the custom `brand-50..950` ramp) — wiring rules and gotchas in ADR 004.
- Global geometry comes from tokens: `--ui-radius: 0.75rem`; typography via `@nuxt/fonts` (Space Grotesk for display, Inter for body).
- Tailwind utilities are for layout and spacing; changes to a component's look go through Nuxt UI theming props/variants, not ad-hoc CSS overrides.

## Consequences

### Positive

- **Accessibility out of the box**: focus trapping, ARIA attributes, and keyboard navigation in modals, selects, popovers, and tooltips — behavior that is expensive to build and easy to get wrong.
- **Rebranding is a one-file change**: because components consume semantic slots, swapping or adjusting the brand ramp propagates everywhere, including dark mode.
- **Dark mode without per-component work**: Nuxt UI v4 drives both themes through CSS variables; components carry no mode-specific styling.
- **Tailwind 4's CSS-first `@theme`** keeps the brand ramp as real custom properties in CSS, which pairs naturally with the runtime-injected semantic variables.
- **Form components surface validation state** (error highlighting, descriptions), which maps directly onto our normalized 422 `fieldErrors` (ADR 007).
- **A coherent upgrade story**: Nuxt UI pins its Tailwind compatibility, so the pair upgrades together instead of drifting.

### Negative

- **The custom-color fallback is empty**: Nuxt UI v4's runtime color injection falls back to Tailwind's JS color table, which has no `brand` entry. The `@theme static` block in `main.css` is therefore load-bearing — omitting it silently unstyles `primary` (this exact incident occurred; see ADR 004).
- **Semantic colors are runtime-injected**, so they never appear in compiled CSS — naive verification (grep the build output) gives false negatives; verification must inspect served HTML.
- **Tailwind 4 breaks with older material**: CSS-first config and the absence of `tailwind.config.js` mean many existing tutorials and Stack Overflow answers no longer apply verbatim.
- **Component API lock-in**: templates bind to Nuxt UI's props and theming class conventions; migrating to a different library later means rewriting templates (state/composables logic survives; markup does not).
- **v4.x is young**: minor releases may still adjust theming internals — the exact version (4.11.0) is pinned and changelogs must be read before bumps.

## Alternatives Considered

| Option                                   | Why it was rejected                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PrimeVue**                             | Mature and broad, but its preset theming is a second theming language layered next to Tailwind, and the custom brand-ramp story is weaker than Nuxt UI's native token pipeline.                              |
| **Vuetify**                              | Solid components, but its Material Design language fights the rounded/coral Eventbrite-like brand, and its runtime theming adds weight without benefit for a Tailwind-centric codebase.                      |
| **shadcn-vue (Radix Vue)**               | Excellent primitives with full code ownership, but every component lives in our repo to maintain — the highest long-term maintenance burden for a solo maintainer, and no integrated dark-mode token system. |
| **Plain Tailwind + headless primitives** | Maximum control, but we would rebuild accessible modals/menus/tables and re-implement the token injection pipeline ourselves — reinventing what Nuxt UI v4 already provides as a Nuxt-native module.         |

## Date

2026-07-30
