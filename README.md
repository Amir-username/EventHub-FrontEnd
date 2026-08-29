# EventHub Frontend

Base structure scaffold for the EventHub storefront + admin dashboard.

- **Stack:** Nuxt 4 · Nuxt UI v4 (Tailwind CSS 4) · TypeScript strict · Pinia · pnpm
- **Design system:** coral brand (`#F05537`), Space Grotesk + Inter, light/dark themes — tokens already wired in `app/assets/css/main.css`
- **Build plan:** see `ROADMAP.md` (0 → 100, phase gates included)

## Quick start

```bash
# 0. Requires Node 20 LTS + pnpm (corepack enable)

# 1. Install
pnpm install

# 2. Configure env
cp .env.example .env        # set NUXT_PUBLIC_API_BASE to your backend URL

# 3. Generate API types (backend must be running; adjust URL in the script if needed)
pnpm types

# 4. Run
pnpm dev
```

The dev server shows a welcome page proving config + tokens work (coral `UButton`, Space Grotesk headings, `.card-surface` panel).

## What is already in place (ROADMAP Phase 1)

| File | Purpose |
|---|---|
| `nuxt.config.ts` | modules, fonts, route rules (SWR public / `ssr:false` private), runtime config |
| `app/app.config.ts` | semantic colors (primary = coral `brand`, neutral = `stone`) — must live inside `app/` in Nuxt 4 |
| `app/assets/css/main.css` | full design-token file — color ramp, radius, shadows, component recipes, reduced-motion |
| `app/app.vue` / `app/error.vue` | app shell + global error page |
| `app/layouts/*` | `default`, `checkout`, `auth`, `admin` minimal shells |
| `shared/utils/` | money (cents) + idempotency-key helpers, auto-imported |
| `eslint.config.mjs`, `.editorconfig`, `.gitignore`, `.nvmrc` | tooling hygiene |

## Directory structure

```
app/
├── app.config.ts            # semantic colors (primary=brand) — Nuxt 4: inside app/, NOT root
├── assets/css/main.css      # design tokens (do not remove @theme static)
├── components/{event,layout,shared}/
├── composables/             # Phase 2: useApi, useAuth, useCountdown, usePagination
├── layouts/                 # default, checkout, auth, admin
├── middleware/              # Phase 2: auth, guest, admin
├── pages/                   # index.vue present; feature pages per ROADMAP
├── plugins/                 # Phase 2: api.ts
└── stores/                  # Phase 2: auth.ts (Pinia)
shared/
├── types/                   # api.d.ts — GENERATED via `pnpm types`, never hand-edit
└── utils/                   # money.ts, idempotency.ts
tests/
```

Empty folders contain `.gitkeep` — delete the placeholder as you add real files.

## Next steps (per ROADMAP.md)

1. **Gate 1:** `pnpm dev` → verify theme toggle + fonts, then run `pnpm types`
2. **Phase 2:** create `useApi.ts`, `stores/auth.ts`, `plugins/api.ts`, `middleware/{auth,guest,admin}.ts`
3. Build features in ROADMAP order: catalog → checkout → auth pages → admin

> ⚠️ Auth note: use JSON `POST /auth/login` — **not** the OAuth2 form endpoint `/auth/token`.
