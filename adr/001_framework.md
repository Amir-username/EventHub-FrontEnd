# ADR 001: Frontend Framework — Nuxt 4 on Vue 3 with Strict TypeScript

## Status

Accepted

## Context

EventHub's frontend serves three distinct surfaces over a single codebase:

1. A **public storefront** (`/`, `/events`, event detail pages) that is the platform's acquisition funnel. These pages compete for search-engine visibility against established ticketing marketplaces, so **server-rendered HTML is a hard requirement, not a nice-to-have** — crawlers must receive fully rendered content, and shared links must produce rich Open Graph previews.
2. **Authenticated app-like flows** (checkout with a 10-minute reservation countdown, account, admin dashboard) where SEO is irrelevant but interactivity, form handling, and session state dominate.
3. A **thin-client contract** with the FastAPI backend: the frontend is a pure API consumer with no database of its own. The backend already exposes an OpenAPI document, so framework features like server-side data modeling matter far less than rendering, routing, and developer experience.

Additional constraints that shaped the choice:

- **Contract fidelity is a known risk.** The backend encodes subtleties the frontend must reproduce exactly (snake_case wire bodies, refresh token as a query parameter, lowercase role values, money in cents). During early development, a store↔API client interface mismatch (`TS2349: This expression is not callable`) shipped silently and was only caught when a real typecheck (`vue-tsc`) finally ran — loose typing was demonstrated to be an operational risk, not a stylistic preference.
- **Nuxt UI v4 + Tailwind CSS 4** (ADR 002) was selected as the UI system, and it integrates as a first-class Nuxt module — a framework that hosts it natively removes an entire class of integration work.
- **Version landscape:** Nuxt 4 is the current stable major (notably: application code moved into an `app/` directory). Nuxt 3 is in maintenance mode; starting a greenfield project on it defers a known breaking migration to later, at higher cost.

We evaluated **Nuxt 4**, **Nuxt 3**, **Next.js (React)**, a **plain Vite + Vue 3 SPA**, and **Astro**.

## Decision

We will use **Nuxt 4 on Vue 3** (Composition API, `<script setup>` single-file components) with **TypeScript in strict mode** for all application code.

Toolchain pins that accompany this decision:

- `typescript: { strict: true }` in `nuxt.config.ts`; `nuxt typecheck` (vue-tsc + `@types/node`) runs as a CI gate so contract drift fails the build (ADR 015).
- **Pinia** (setup-style stores) for state management.
- **pnpm 10.12.1** pinned via the `packageManager` field and **Node >= 20** via `.nvmrc`, for reproducible installs.
- Contract types are **generated, not hand-written**: `openapi-typescript` pulls the backend's `/openapi.json` into `shared/types/api.d.ts`.

Scope note: this ADR fixes the _capability_ — the framework must server-render public pages for SEO. The per-route rendering policy (SWR for public pages, client-only for token-dependent pages) is governed by ADR 006.

## Consequences

### Positive

- **SEO by default for the storefront**: event listing and detail pages ship crawlable server-rendered HTML with OG metadata, directly supporting organic acquisition against established competitors.
- **One codebase, two rendering worlds**: Nitro `routeRules` express "SSR+SWR for public, client-only for private" declaratively, with no custom server code — the same framework serves the funnel and the dashboard.
- **First-class Nuxt UI v4 integration**: the UI system installs as a native module; design tokens flow through `app/app.config.ts` and Tailwind 4's `@theme` (see ADR 004 for the wiring rules).
- **Generated contract types + strict TS**: the frontend's types derive from the backend's OpenAPI schema, and `vue-tsc` in CI catches interface drift at build time — this exact mechanism caught the useApi/store `TS2349` bug before release.
- **File-based routing and auto-imports** keep pages, middleware, layouts, and composables discoverable with minimal boilerplate — significant for a small team.
- **Vue 3 Composition API** lets non-component logic (auth store, API client) live as ordinary composables, testable without component mounts.

### Negative

- **Nuxt 4's `app/` directory is a silent-failure trap**: config files placed at the project root (Nuxt 3 habit) are ignored without any warning — this bit us in practice with `app.config.ts` and cost a debugging session (documented in ADR 004).
- **vue-tsc is stricter than editor tooling**: ofetch's loose `FetchOptions` (`method: string`) does not satisfy Nuxt's Nitro-flavored options (literal method unions), requiring type derivation like `Parameters<typeof fetcher>[1]`. Expect occasional type-level friction between library generations.
- **SSR caching constrains session handling**: SWR-cached pages are shared across users, so user data must never render server-side; session bootstrap must run client-side before route middleware (ADRs 006, 007, 011). This adds ordering constraints a plain SPA would not have.
- **Hydration and plugin-ordering complexity** (client-only plugins, cookie-ref sharing between composable and store) are new failure modes compared to a Vite SPA, and require deliberate verification (real build + served HTML, not just dev-server spot checks).
- **Major-version upgrades are breaking** (the 3->4 `srcDir` move being the live example); staying current requires budgeting migration work periodically.

## Alternatives Considered

| Framework            | Why it was rejected                                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nuxt 3**           | Same paradigm and ecosystem, but an older major already in maintenance. Choosing it would defer the known 3->4 migration (including the `app/` srcDir change) to mid-project when the codebase is larger and the move is more expensive.          |
| **Next.js (React)**  | Its React Server Components direction is server-heavy; with a separate FastAPI backend owning all data, RSC adds architectural surface without benefit.                                                                                           |
| **Vite + Vue 3 SPA** | The simplest option and closest to the team's comfort zone, but it has no SSR story without bolting on custom server infrastructure — and server-rendered HTML for the public funnel is a hard requirement. Rejected on the SEO constraint alone. |
| **Astro**            | Strong for content-driven sites, but EventHub's checkout (10-minute reservation countdown), account, and admin surfaces are session-heavy app shells. The islands architecture fights exactly the interactions that dominate those pages.         |

## Date

2026-07-30
