# EventHub Frontend — 0 → 100 Roadmap

> Complete build plan for the EventHub storefront + admin dashboard, from a blank machine to production.
>
> - **Stack:** Nuxt 4 · Nuxt UI v4 (Tailwind CSS 4) · TypeScript strict · Pinia · pnpm
> - **Backend:** FastAPI — contract cheat sheet in **Appendix A**
> - **Design system:** coral brand (`#F05537`), Space Grotesk + Inter, dark/light themes — drop-in files in `eventhub-design-system/`
> - **Estimated effort:** 5–7 working days
>
> Drop this file in your repo root as `ROADMAP.md` and work top to bottom. **Do not cross a Gate until its checklist passes.**

---

## How this roadmap is ordered

- **Phase 0–2 = foundation** (environment → config → infrastructure). Nothing user-visible, everything load-bearing.
- **Phase 3–6 = features**, deliberately **risk-ordered**: the reservation/checkout flow (highest contract risk) is built *before* the low-risk auth forms. The auth *system* (store, refresh, guards) is Phase 2; only the auth *pages* are Phase 5. See the note in Phase 5.
- **Phase 7–10 = quality and launch.**
- Appendices A–E are reference material — keep them open while building.

---

## Phase 0 — Prerequisites & Environment (Day 0, ~half day)

### 0.1 Toolchain

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | pin with `.nvmrc` |
| pnpm | 9+ | `corepack enable` — do not mix npm/yarn |
| Git | latest | conventional commits from day one |
| Editor | VS Code | extensions: Vue — Official (Volar), ESLint, Tailwind CSS IntelliSense |

### 0.2 Backend running locally

1. Clone `https://github.com/Amir-username/EventHub`, install deps, configure its `.env` (database URL, JWT keys).
2. Start the API (uvicorn).
3. Verify: `GET /healthz` → 200, `GET /db-health` → 200, and `/docs` (Swagger) opens.
4. Note the **API prefix** every endpoint lives under — the frontend's `apiBase` must include it.

### 0.3 Test data & access

- [ ] A seeded **ADMIN** account and a **CUSTOMER** account exist
- [ ] Register works via `/docs` (note: payload requires `confirm_pass`)
- [ ] You know where the reservation window is configured (`reservation_window_minutes`, default 10)

### ✅ Gate 0

- [ ] Backend `/healthz` returns 200
- [ ] Login works from Swagger UI
- [ ] Node/pnpm versions pinned (`.nvmrc`, `packageManager` field)

---

## Phase 1 — Bootstrap & Config-First (Day 1)

**Rule: no feature code until every item in this phase is done.** Configuration debt is the most expensive debt in a Nuxt project.

### 1.1 Scaffold & dependencies

```bash
pnpm dlx nuxi@latest init eventhub-frontend
cd eventhub-frontend
pnpm add @nuxt/ui @pinia/nuxt
pnpm add -D openapi-typescript @nuxt/eslint
```

### 1.2 Configuration files — in this exact order

**1. `nuxt.config.ts`** — the single source of truth:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],

  fonts: {
    families: [
      { name: 'Inter', weights: [400, 500, 600, 700] },          // body
      { name: 'Space Grotesk', weights: [500, 600, 700] }        // display
    ]
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
    }
  },

  routeRules: {
    '/':            { swr: 60 },        // public, cacheable for SEO
    '/events':      { swr: 60 },
    '/events/**':   { swr: 60 },
    '/checkout/**': { ssr: false },     // token-dependent, client-only
    '/account/**':  { ssr: false },
    '/admin/**':    { ssr: false }
  },

  typescript: { strict: true }
})
```

⚠️ **SWR caution:** cached pages are shared across users — never render authenticated content (name in header, etc.) during SSR on `swr` routes. Render account state client-side only.

**2. `app/app.config.ts`** — semantic color mapping (from design system). ⚠️ Nuxt 4 keeps this file **inside `app/`**, next to `app.vue` — a root-level `app.config.ts` is silently ignored and colors fall back:

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',    // coral
      secondary: 'teal',
      success: 'green', info: 'blue', warning: 'amber', error: 'red',
      neutral: 'stone'
    }
  }
})
```

**3. `app/assets/css/main.css`** — copy the design-system token file verbatim (coral 50–950 ramp, `--ui-radius: 0.75rem`, light/dark `--ui-bg`, component recipes `.event-card`, `.countdown-urgent`, `.numeric`). ⚠️ **Keep `@theme static`** — Tailwind 4 + Nuxt UI dynamic colors require it.

**4. `.env` + `.env.example`**

```bash
NUXT_PUBLIC_API_BASE=http://localhost:8000/api
NUXT_PUBLIC_APP_URL=http://localhost:3000
```

**5. Lint & editor** — `@nuxt/eslint` module, `.editorconfig`, verify `.gitignore` covers `.env` and `.output`.

**6. Version pinning** — `.nvmrc` (`20`), `packageManager: "pnpm@x.y.z"` in `package.json`.

### 1.3 Generate API types from the backend

```bash
pnpm openapi-typescript http://localhost:8000/openapi.json -o shared/types/api.d.ts
```

Add a script `"types": "openapi-typescript $NUXT_PUBLIC_API_BASE/openapi.json -o shared/types/api.d.ts"` and re-run it **whenever the backend changes**. Every API call in the app types against this file.

### 1.4 Install smoke test

- [ ] `pnpm dev` starts clean, zero console errors
- [ ] A test `UButton` renders coral in light **and** dark
- [ ] `UColorModeButton` toggles themes and persists on reload
- [ ] Inter (body) and Space Grotesk (display) both render

### ✅ Gate 1

- [ ] All six config steps done, committed separately ("chore: ...")
- [ ] `shared/types/api.d.ts` generated and imported somewhere without TS errors
- [ ] Theme toggle + fonts verified

---

## Phase 2 — Core Infrastructure (Day 2)

Still zero pages. These six pieces unblock every feature after them.

### 2.1 `app/composables/useApi.ts` — the most important file in the app

One wrapper encoding the **entire** backend contract:

| Concern | Behavior |
|---|---|
| Base URL | from `runtimeConfig.public.apiBase` |
| Auth header | attach `Authorization: Bearer <access>` when present |
| 401 | single-flight refresh, retry the original call once; on refresh failure → logout + redirect to login |
| 429 | read `Retry-After`, toast "too many requests", no blind retry (limit is 100 req/60s/IP) |
| 422 | map the validation **array** → per-field form errors |
| 409 | conflict message (idempotency / concurrent edit) |
| Error shape | normalize `{"detail": "..."}` strings everywhere |
| Optional | `X-Request-ID` header per request (backend allows it — great for support) |

### 2.2 Auth store (`app/stores/auth.ts`, Pinia)

- Login via **`POST /auth/login` (JSON)**. ⚠️ Do **not** use `/auth/token` — that is the OAuth2 form-compatible endpoint.
- Register mirrors backend payload including `confirm_pass`.
- Token lifetime: **access 30 min / refresh 4 days**. Persist refresh in a cookie; keep access in memory/cookie — never `localStorage` for SSR-shared pages.
- Expose `user`, `role` (`CUSTOMER` | `ADMIN`), `login()`, `logout()`, `refresh()`.

### 2.3 Middleware

- `auth.ts` — requires a session; `guest.ts` — authed users skip login/register; `admin.ts` — requires `role === 'ADMIN'`.
- Attach via `definePageMeta`, not layout logic.

### 2.4 Layouts & chrome

- `default.vue` (header/footer), `checkout.vue` (distraction-free), `auth.vue` (centered card), `admin.vue` (sidebar).
- `AppHeader`: nav, `UColorModeButton`, account menu (client-rendered only — SWR-safe).
- `AppFooter`: static.

### 2.5 Domain utilities

- `shared/utils/money.ts` — backend stores **cents + currency**. Format with `Intl.NumberFormat` from the integer; never float math.
- `shared/utils/idempotency.ts` — `crypto.randomUUID()` per reservation attempt; persist until the request succeeds or the user abandons (retry must reuse the same key — that is its purpose).
- `app/composables/useCountdown.ts` — tick from an absolute UTC expiry; expose `isUrgent` (< 60 s) and `done`. All math in UTC; display via locale.

### 2.6 Global UX plumbing

- `app/error.vue` — 404 vs 500 branches.
- `useToast` wiring for API error normalization from 2.1.

### ✅ Gate 2

- [ ] Can log in against the real backend from a scratch page; role visible in the store
- [ ] Access-expiry refresh works (simulate by shortening access TTL or clearing the access token)
- [ ] Guards redirect correctly (guest → login, customer → blocked from `/admin`)
- [ ] Money and countdown utils unit-sane

---

## Phase 3 — Public Catalog (Day 3)

### 3.1 Pages

- `pages/index.vue` — hero + featured events (`useFetch`, served via `swr: 60`).
- `pages/events/index.vue` — storefront grid `grid-cols-1 → sm:2 → lg:3 → xl:4`, `max-w-7xl`.
- `pages/events/[id].vue` — detail: description, venue, ticket types with sale-window status, `PriceTag`.

### 3.2 Shared components

- `EventCard.vue` — uses `.event-card` recipe (hover lift + shadow).
- `StatusBadge.vue` — one component, semantic map in **Appendix C**.
- `PaginationControls.vue` + `usePagination()` — wraps the `{items, total, offset, limit}` envelope. **limit ≤ 100** — clamp it.
- Loading skeletons + `EmptyState.vue`.

### 3.3 SEO

- `useSeoMeta` on every public page (title, description, og).

### ✅ Gate 3

- [ ] Pagination correct at envelope boundaries (last page, empty result)
- [ ] Empty and loading states render
- [ ] Detail page shows each ticket-window state (upcoming / on sale / sold out)

---

## Phase 4 — Reservation & Checkout (Day 4) — ⚠️ highest-risk phase

> The auth *pages* don't exist yet. Use a scratch page or Swagger to obtain a token for testing. See Phase 5 for why this order is intentional.

### 4.1 Reserve action

- Guarded by `auth` middleware; unauthenticated click → redirect to `/auth/login?redirect=<back>` (login page arrives in Phase 5).
- `POST /reservations` with a **client-generated `idempotency_key`** (UUID) — reused on retry, never regenerated mid-attempt.
- Handle **409** (duplicate idempotency conflict) as "you already have this reservation".

### 4.2 Checkout page

- `pages/checkout/[reservationId].vue` — `ssr: false`, `checkout.vue` layout.
- Live countdown from the reservation's UTC expiry (10-minute window) using `.numeric` and `.countdown-urgent` in the final minute.
- Expired window → friendly expired state with a path back to the event.

### 4.3 Scope boundary

⚠️ **Do not build payment UI.** Orders/payments/webhooks exist as backend *models* but no API is wired yet. Checkout ends at "reservation confirmed". Revisit when the backend ships payment endpoints.

### ✅ Gate 4

- [ ] Full loop: reserve → countdown → confirmed
- [ ] Retrying with the same idempotency key creates no duplicate
- [ ] Expired reservation handled gracefully (no dead end, no crash)
- [ ] 429 during rapid testing surfaces a readable toast, not silence

---

## Phase 5 — Account & Auth Pages (Day 4–5)

> **Why after checkout?** Risk-ordering. Checkout is where backend surprises surface; auth forms are the most standardized UI in existence. Building flows first also *writes the login page's spec*: it now must support `?redirect=` resume-into-checkout, which you'd otherwise have to guess.

### 5.1 Auth pages

- `pages/auth/login.vue` + `pages/auth/register.vue` — `UForm` + zod schemas **mirroring backend rules** (email format, password policy, `confirm_pass` match). Client errors should match what the backend would return — no disagreement between layers.
- Honor `?redirect=` (with an allowlist of internal paths — never redirect to external URLs).

### 5.2 Account

- `pages/account/reservations.vue` — `GET /reservations/mine`, `StatusBadge` per state (pending / confirmed / expired / cancelled).
- Account menu in `AppHeader`.

### ✅ Gate 5

- [ ] Unauthenticated reserve → login → **resumes checkout** before the window expires
- [ ] Register validation agrees with the backend (test one failing case both ways)
- [ ] My-reservations reflects live states

---

## Phase 6 — Admin Dashboard (Day 5–6)

### 6.1 Shell

- `layouts/admin.vue` (sidebar) + `admin` middleware — role check, customer → clean 403 view.

### 6.2 Pages

- `/admin/users` — `UTable` + `UPagination` over the same envelope; role badges.
- `/admin/events` — list + create/edit forms; statuses `draft / published / cancelled`; handle **409** on concurrent edits.
- `/admin/venues` — CRUD.

### ✅ Gate 6

- [ ] Customer blocked from every `/admin` route
- [ ] Tables paginate and sort
- [ ] CRUD round-trips; 409 surfaces as a refreshable conflict message

---

## Phase 7 — Hardening (Day 6)

- **Accessibility:** small brand text uses `brand-600/700` (light) / `brand-300/400` (dark) — `brand-500` only for buttons, icons, large text. `prefers-reduced-motion` already disabled in `main.css` — verify. Full keyboard nav + visible focus rings.
- **States:** every route has loading, empty, and error treatments.
- **SEO:** OG tags, canonical URLs.
- **Responsive:** verify the storefront grid at all four breakpoints.

## Phase 8 — Testing & Release Prep (Day 6–7)

- **Unit (Vitest):** `money`, `useCountdown`, API error normalization, idempotency-key persistence.
- **Optional e2e (Playwright):** login → browse → reserve → confirm happy path.
- `pnpm build && pnpm preview` clean, zero console errors.
- Lighthouse sanity pass (a11y, SEO).

## Phase 9 — Production Launch (Day 7)

**Backend coordination — before deploy:**

- [ ] `cors_origins` env on the backend includes your production origin (exact origin, no trailing slash)
- [ ] Custom headers are **not** used — backend only allows `Authorization`, `Content-Type`, `X-Request-ID`
- [ ] Rate-limit expectations confirmed (100 req/60s/**IP** — shared CDNs/proxies can aggregate)

**Deploy:**

- [ ] Env vars: `NUXT_PUBLIC_API_BASE` (prod), `NUXT_PUBLIC_APP_URL`
- [ ] Route rules verified in prod (public pages cached, private pages `ssr: false`)

**Post-deploy smoke:** login → browse → reserve → countdown → confirm → admin table loads, in both themes.

## Phase 10 — Post-Launch (ongoing)

- Monitor: 429 rate, 401/refresh failures, reservation-expiry vs confirm conversion.
- Track backend backlog: **payments/orders APIs** (→ checkout v2), refresh-token rotation policy, prod CORS finalization.

---

## Appendix A — Backend Contract Cheat Sheet

### Endpoints

| Group | Endpoints | Auth | Notes |
|---|---|---|---|
| `/auth` | login (JSON), register, refresh | public | `/auth/token` = OAuth2 form endpoint — don't use from the SPA |
| `/venues` | public list/detail + admin CRUD | mixed | |
| `/events` | public list/detail + admin CRUD | mixed | |
| `/ticket-types` | per event, public + admin | mixed | sale-window states drive badges |
| `/reservations` | `POST` (+ `idempotency_key`), `GET /mine` | Bearer | 10-minute hold window |
| `/admin/users` | list | ADMIN | |
| `/healthz`, `/db-health` | ops | public | |

### Rules that bite if ignored

| Rule | Consequence of ignoring |
|---|---|
| JWT RS256, `Authorization: Bearer` header | 401 loops if you use cookies/query params |
| Access 30 min / refresh 4 days | random logouts without refresh handling |
| Register requires `confirm_pass` | 422 on submit if omitted |
| Pagination envelope `{items, total, offset, limit}` | broken "next page" if you assume page numbers |
| `limit` max **100** | 422 if you send more |
| Errors: `{"detail": string}`; 422 = validation **array**; 409 = conflict; 429 = rate limit + `Retry-After` | unreadable failures if you assume one error shape |
| Money = **cents + currency** | prices off by 100× if you treat as floats |
| Timestamps ISO 8601 **UTC** | countdown drift if parsed as local time |
| Reservation window **10 minutes** | expired-checkout dead ends |
| 429: 100 req/60s/IP | silent failures during dev hammer-testing |
| Prod CORS allow-list (`cors_origins`) + only `Authorization/Content-Type/X-Request-ID` headers | every prod request blocked despite working dev |

## Appendix B — Final Directory Structure

```
eventhub-frontend/
├── nuxt.config.ts
├── .env.example
├── .nvmrc
├── app/
│   ├── app.config.ts               # semantic colors — must be INSIDE app/ (Nuxt 4)
│   ├── app.vue                     # NuxtLayout + NuxtPage + Toaster
│   ├── error.vue
│   ├── assets/css/main.css         # design tokens (from design system)
│   ├── components/
│   │   ├── event/                  # EventCard, StatusBadge, CountdownTimer, PriceTag
│   │   ├── layout/                 # AppHeader, AppFooter
│   │   └── shared/                 # EmptyState, PaginationControls
│   ├── composables/
│   │   ├── useApi.ts               # Bearer, refresh, error normalization
│   │   ├── useAuth.ts
│   │   ├── useCountdown.ts
│   │   └── usePagination.ts
│   ├── layouts/                    # default, checkout, auth, admin
│   ├── middleware/                 # auth, guest, admin
│   ├── pages/
│   │   ├── index.vue
│   │   ├── events/index.vue
│   │   ├── events/[id].vue
│   │   ├── checkout/[reservationId].vue
│   │   ├── account/reservations.vue
│   │   ├── auth/login.vue
│   │   ├── auth/register.vue
│   │   └── admin/                  # users.vue, events.vue, venues.vue
│   ├── plugins/api.ts
│   └── stores/auth.ts
├── shared/
│   ├── types/api.d.ts              # generated — do not hand-edit
│   └── utils/                      # money.ts, idempotency.ts
└── tests/
```

## Appendix C — Status Badge Semantics

| Domain | State | Badge color |
|---|---|---|
| Event | `draft` / `published` / `cancelled` | neutral / green / red |
| Reservation | `pending` / `confirmed` / `expired` / `cancelled` | amber / green / neutral / red |
| Ticket window | `upcoming` / `on sale` / `sold out` | teal / green / red |
| Countdown (< 60 s) | urgent | amber pulse (`.countdown-urgent`) |

## Appendix D — Phase Gates Summary

| Gate | One-line definition of done |
|---|---|
| 0 | Backend healthy, accounts seeded, toolchain pinned |
| 1 | Config complete, types generated, theme toggle verified |
| 2 | Real login works; guards, money, countdown unit-sane |
| 3 | Catalog paginates at envelope boundaries; all ticket states render |
| 4 | Reserve → countdown → confirm loop; idempotency + expiry handled |
| 5 | Login resumes checkout via `?redirect=`; validation mirrors backend |
| 6 | Role-blocked admin; CRUD round-trips; 409 handled |
| 7–8 | A11y pass, all states covered, unit tests green, clean build |
| 9 | Prod CORS confirmed, deployed, full smoke in both themes |

## Appendix E — Gotchas Register (read twice)

1. **`/auth/login` (JSON), not `/auth/token`** (OAuth2 form) — classic first-day bug.
2. **Cents are integers** — one `money.ts`, used everywhere, no exceptions.
3. **`limit ≤ 100`** — clamp in `usePagination`, not at call sites.
4. **Idempotency key persists across retries** — regenerate only on a *new* attempt.
5. **`@theme static`** must stay in `main.css` or Nuxt UI colors silently break in Tailwind 4.
6. **SWR pages are shared across users** — account state renders client-side only on `/` and `/events/**`.
7. **No custom request headers** in prod — backend whitelist is only `Authorization / Content-Type / X-Request-ID`.
8. **No payment UI yet** — backend models exist, API doesn't; checkout ends at reservation confirmed.
9. **Countdown math in UTC** — display converts, logic never does.
10. **`brand-500` fails AA for small text** — small brand text uses `brand-600/700` (light) / `brand-300/400` (dark).
