# ADR 003: State Management — Pinia with Setup-Style Stores

## Status

Accepted

## Context

The frontend's global state has one dominant citizen today — the auth session — and more coming (catalog filters, checkout cart). The state layer must satisfy:

1. **Cross-cutting access.** Session state (tokens, user profile, role) is consumed by the API client, the bootstrap plugin, route middleware, and pages. Prop drilling or per-component copies would drift; one shared store is required.
2. **Composition over ceremony.** The auth store is built FROM other composables — `useCookie` for persistence and `useApi` for transport. The store definition should read like ordinary Composition API code, not fight it.
3. **SSR safety.** Nuxt renders on the server per-request; module-level mutable singletons would leak state between requests. The state solution must integrate with Nuxt's per-request lifecycle and payload serialization.
4. **Type ergonomics.** With TypeScript strict mode (ADR 001), getters and actions should infer types without annotations boilerplate.
5. **Debuggability.** Session and guard bugs are state bugs; DevTools inspection (state snapshots, action tracing) materially shortens diagnosis — as proven while fixing the store↔API interface mismatch.

We evaluated **Pinia setup-style stores**, **Pinia options-style stores**, **plain composables + provide/inject**, and **Vuex 4**.

## Decision

We will use **Pinia** (via `@pinia/nuxt`) with **setup-style store definitions** for all global state.

Rules that accompany this decision:

- Stores live in `app/stores/`, one domain per store (`auth` now; catalog/checkout stores later).
- Setup style only: `defineStore("auth", () => { /* refs, computed, functions */ return { ... } })` — the options-style object form is not used anywhere.
- Every store returns an **explicit public surface**: state, getters, and actions are all listed in the return object; anything not returned is private to the store.
- Stores compose composables freely (`useCookie`, `useApi`, `computed`) — that is the primary reason for this style.
- **Dependency direction: stores → composables, never store → store.** Cross-domain needs go through composables or event/URL state, preventing circular store references.
- Cookie persistence is part of the store's state definition (`useCookie` refs as state), so reactivity and persistence are the same mechanism.

## Consequences

### Positive

- **Stores are just Composition API**: the auth store directly composes `useCookie` (token persistence) and `useApi` (transport), with computed getters (`isAuthenticated`, `isAdmin`) — zero adapter code between the store and the rest of the Nuxt ecosystem.
- **Native type inference**: refs, computeds, and functions return their natural types; no `getters: { x: (state): Type => ... }` ceremony, which matters under strict TypeScript.
- **Tree-shakeable**: each store is an independent module; pages that never touch the admin store don't pay for it.
- **DevTools integration**: state inspection and action tracing worked exactly as needed when debugging guard/refresh behavior.
- **SSR-safe by construction**: `@pinia/nuxt` scopes the pinia instance per request and handles payload serialization — no hand-rolled singleton guards.

### Negative

- **Less visual structure**: options-style stores separate state/getters/actions into labeled sections; setup style mixes them in one function body. Discipline (commented sections, explicit return grouping) is required to keep larger stores readable — the auth store already needed section headers to stay navigable.
- **The return object is a silent-visibility contract**: forgetting to return a ref or action makes it invisible to consumers without any error. This is the style's main footgun and must be caught in review.
- **Circular references are easier to create**: setup functions can reference each other's stores accidentally; hence the stores→composables-only dependency rule.
- **Tutorial skew**: most Pinia material online demonstrates the options style; contributors arriving from tutorials may mix styles unless the convention is documented (this ADR).

## Alternatives Considered

| Option                                 | Why it was rejected                                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pinia options-style**                | The same library with more ceremony under strict TS (getter/action typing), weaker composition with `useCookie`/`useApi`, and it invites mixing two styles in one codebase. Pinia itself recommends setup style for Composition API codebases. |
| **Plain composables + provide/inject** | Workable for leaf features, but app-wide singletons, SSR serialization, DevTools integration, and strict "one instance" guarantees would all be hand-rolled and re-tested.                                                                     |
| **Vuex 4**                             | Legacy: mutations boilerplate, Vue-2-era patterns, and effectively in maintenance mode. No reason to introduce it into a greenfield Vue 3 codebase.                                                                                            |

## Date

2026-07-30
