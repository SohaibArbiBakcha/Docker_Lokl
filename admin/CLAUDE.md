# CLAUDE.md — Lokl Admin Back-office

> Read `../rules.md` first. This file adds admin-specific context on top of it.

---

## Stack

| Item        | Value                                          |
|-------------|------------------------------------------------|
| Framework   | React 18 + JavaScript (JSX)                   |
| Build tool  | Vite 8                                         |
| Admin UI    | react-admin 5 (data + auth provider pattern)   |
| Component   | MUI (Material UI) v5 — NOT Tailwind            |
| Charting    | Recharts                                       |
| Icons       | @mui/icons-material                            |

> Note: this project is MUI-only. The stale Tailwind config (`tailwind.config.js`, `postcss.config.js`, `@tailwind` directives) was removed in July 2026 — it was never in `package.json` and no component used it. Do not reintroduce Tailwind here.

---

## Folder Structure

```
src/
├── App.jsx                   ← react-admin <Admin> root, registers all <Resource>s
├── main.jsx                  ← React entry point
├── index.css                 ← global styles (minimal)
├── providers/
│   ├── authProvider.js       ← login/logout/checkAuth/getIdentity/getPermissions (staff roles only)
│   ├── dataProvider.js       ← maps react-admin CRUD calls to backend REST API
│   └── httpClient.js         ← shared fetch client: token injection + auto-refresh on 401
├── hooks/
│   └── useDashboardStats.js  ← dashboard data fetching (rules.md §7)
├── components/
│   ├── Dashboard.jsx         ← KPI cards + user growth chart (uses useDashboardStats)
│   ├── LoginPage.jsx         ← custom login form
│   ├── AppLayout.jsx         ← custom layout: user menu with "Changer le mot de passe"
│   └── ChangePasswordPage.jsx ← custom route /change-password → PATCH /users/me/password
└── resources/                ← one folder per entity
    ├── users/index.jsx        ← role-aware: role select + delete hidden for moderators
    ├── groups/index.jsx
    ├── events/index.jsx
    ├── tickets/index.jsx      ← TicketShow renders the QR image (qrcode.react)
    ├── payments/index.jsx
    ├── reviews/index.jsx
    ├── categories/index.jsx
    ├── cities/index.jsx
    └── audit-logs/index.jsx   ← read-only staff action trail
```

---

## Key Patterns

### react-admin data flow
The `dataProvider` in `providers/dataProvider.js` translates react-admin calls (`getList`, `getOne`, `create`, `update`, `delete`) into backend REST calls. It:
- Adds `Authorization: Bearer <token>` from `localStorage`
- Translates pagination: react-admin `{ page, perPage }` → backend `?_start=N&_end=M`
- Reads `X-Total-Count` header for totals
- Normalizes `_id` → `id` for react-admin compatibility

### authProvider
Stored in `providers/authProvider.js`. `localStorage` keys: `lokl_token` (access), `lokl_refresh` (refresh), `lokl_user`. Login rejects non-staff roles client-side (the API also serves mobile members). `httpClient` transparently refreshes the access token once on 401 before giving up; `checkError` then clears storage and forces re-login.

### API URL
```ts
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';
```
Set `VITE_API_URL` in `admin/.env` for non-default backends.

### Custom components in resource files
Use `useRecordContext()` to access the current row/record inside list columns:
```tsx
const MyBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  return <Chip label={record.status} />;
};
```

---

## What Is Built

- [x] Login page (custom MUI form) — staff-only guard client-side
- [x] Auth provider with refresh-token session (auto-refresh on 401 via `httpClient`)
- [x] Data provider (full CRUD, getMany, getManyReference)
- [x] Users update routes `role`/`is_banned` through dedicated `PATCH /:id/role` / `:id/ban`
- [x] Dashboard with KPI cards + user growth bar chart (`useDashboardStats` hook)
- [x] Resources: users, groups, events, tickets, payments, reviews, categories, cities
- [x] Payment list + show: MAD display, status badge, gateway, gateway_ref, user reference
- [x] Password change page (/change-password, user menu → "Changer le mot de passe")
- [x] Ticket QR image in TicketShow (`qrcode.react`)
- [x] Role-aware UI: moderators don't see the role select or the user delete button (backend enforces it too)
- [x] Audit log resource (read-only) — who did what, when, with sanitized request bodies
- [x] EventCreate/GroupCreate reference pickers for group/city/category (both forms previously omitted required foreign keys and could never submit successfully)

## What Is NOT Built Yet

- [ ] RTL layout support (Arabic) — MUI supports it via `<CacheProvider>` + `createCache({ stylisPlugins: [rtlPlugin] })`
- [ ] Bulk actions (intentionally disabled with `bulkActionButtons={false}` everywhere)
- [ ] File upload fields (cover images, avatars)
- [ ] Export to CSV/Excel

---

## Known Issues

Issues 1–3 from the original list (Dashboard direct fetch, UserEdit role via PUT, PaymentShow missing fields) were fixed in July 2026. Remaining: no RTL support (see above).

---

## Adding a New Resource

1. Create `src/resources/<name>/index.jsx` exporting `<Name>List`, `<Name>Edit`, `<Name>Create`, `<Name>Show`
2. Import and register in `App.jsx` as `<Resource name="<name>" list={...} edit={...} .../>`
3. The `dataProvider` handles it automatically via the `resource` string matching the backend route

---

## Environment

```
VITE_API_URL=http://localhost:5000/api/v1
```

No secrets in the admin `.env` — it's the front-end, everything in it is public.

---

## Base Path: /admin

The back-office is served under **`/admin`** (the public landing page owns `/`):
- `vite.config.js` has `base: '/admin/'` — the dev server URL is
  `http://localhost:5173/admin/` (the root path 404s, that's expected).
- `App.jsx` wraps `<Admin>` in `<BrowserRouter>` with `basename="/admin"`.
- `npm run build:site` (repo root) assembles landing + this app into `site/`
  for the single Netlify deploy. See `scripts/build-site.mjs`.

## Production Build

`Dockerfile` is a two-stage build: Vite build → served by nginx (`nginx.conf`,
SPA fallback + gzip + basic security headers). `VITE_API_URL` is baked into
the JS bundle at build time — pass it as a Docker build arg, not a runtime env
var: `docker build --build-arg VITE_API_URL=https://api.lokl.ma/api/v1 .`

`vite.config.js` splits the production bundle into vendor chunks
(`vendor-react`, `vendor-mui`, `vendor-admin`, `vendor-charts`) so browsers
cache library code across deploys instead of re-downloading one ~1.3MB blob
every release. This project's Vite build runs on Rolldown, which requires
`manualChunks` as a function, not the plain object form from older Rollup docs.
