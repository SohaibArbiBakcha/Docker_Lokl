# CLAUDE.md — Lokl Backend

> Read `../rules.md` first. This file adds backend-specific context on top of it.

---

## Stack

| Item        | Value                                      |
|-------------|--------------------------------------------|
| Runtime     | Node.js 20+                                |
| Framework   | Express 4 (NOT NestJS — see root CLAUDE.md)|
| Language    | JavaScript (ES modules, `.js`) — NOT TypeScript despite older docs |
| Database    | MongoDB 7 via Mongoose 8                   |
| Auth        | JWT access (15 min) + rotating refresh (30 d); Google Sign-In via ID-token verification |
| Validation  | Zod (wired on auth register/login and `PUT /users/me`) |
| Security    | helmet, cors, express-rate-limit (5 POSTs/15 min on `/auth`) |

---

## Folder Structure

```
src/
├── index.js                  ← app bootstrap, route mounting, global middleware, graceful shutdown
├── config/
│   ├── db.js                 ← Mongoose connection
│   ├── env.js                ← typed ENV object — always import this, never process.env directly
│   ├── logger.js             ← pino (JSON in prod, pretty in dev, secrets redacted)
│   └── sentry.js             ← optional error tracking (no-op until SENTRY_DSN set)
├── controllers/
│   ├── auth.controller.js    ← login, register, google, refresh, getMe
│   ├── crud.controller.js    ← generic CRUD factory used by all resource routes
│   └── dashboard.controller.js ← aggregate stats for admin dashboard
├── middleware/
│   ├── asyncHandler.js       ← wraps async route handlers to forward errors to errorHandler
│   ├── auth.middleware.js    ← requireAuth, requireAdmin (staff), requireSuperAdmin (admin only)
│   ├── audit.middleware.js   ← records successful staff writes to the audit log
│   └── error.middleware.js   ← global error handler + 404 handler
├── models/                   ← Mongoose schemas
│   ├── user.model.js, event.model.js, group.model.js, ticket.model.js
│   ├── payment.model.js, review.model.js, category.model.js, city.model.js
│   ├── message.model.js      ← group chat messages
│   └── audit-log.model.js    ← staff action trail
├── routes/                   ← one file per resource, mounts CRUD + custom endpoints
│   ├── health.routes.js      ← GET /health (unauthenticated, LB probe)
│   ├── auth.routes.js        ← login, register, google, refresh, me
│   ├── users.routes.js       ← admin CRUD + role/ban + self profile/password/CNDP
│   ├── events.routes.js      ← CRUD + register/unregister + review/reviews
│   ├── groups.routes.js      ← CRUD + mine + join/leave + messages (chat)
│   ├── tickets.routes.js     ← mine + checkin + admin CRUD
│   ├── payments.routes.js, reviews.routes.js, categories.routes.js, cities.routes.js
│   ├── audit-logs.routes.js  ← read-only staff action trail
│   └── dashboard.routes.js
└── scripts/
    └── seed.js               ← seeds admin + demo member, 6 Moroccan cities, 8 categories
```

---

## Key Patterns

### Always use asyncHandler
Every `async` route function must be wrapped in `asyncHandler` so errors reach the global error middleware. Without it, unhandled promise rejections bypass `errorHandler`.

```ts
// ✓ correct
router.get('/', asyncHandler(async (req, res) => { ... }));

// ✗ wrong — errors go nowhere
router.get('/', async (req, res) => { ... });
```

### Always import ENV, never process.env
```ts
import { ENV } from '../config/env';
// ✓
const secret = ENV.JWT_SECRET;
// ✗
const secret = process.env.JWT_SECRET;
```

### Generic CRUD factory
`makeCrudController(Model, populateFields?)` returns `{ getList, getOne, create, update, remove }`. Use it for simple resources. For resources with business rules (payments, tickets, users), add custom handlers on top.

The factory:
- Sanitizes query filters (drops MongoDB operators like `$where`)
- Sanitizes write bodies (drops `password_hash`, `role`, `__v`, `_id`)
- Supports react-admin pagination: `?_start=0&_end=10&_sort=created_at&_order=DESC&q=search`
- Sets `X-Total-Count` header for pagination

### Auth middleware chain
```js
router.use(requireAuth);                 // any authenticated user (members included)
router.put('/:id', requireAdmin, ...);   // staff-only, applied per route
```
`requireAuth` — verifies JWT, attaches `req.adminId` (the authenticated user's id — members too, despite the name) and `req.adminRole`.
`requireAdmin` — checks role is `admin` or `moderator`.
Ownership checks (events/groups) live in the route files: staff bypass, otherwise `created_by`/`owner_id` must match `req.adminId`.

---

## What Is Built

- [x] MongoDB connection + ENV config (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` all required at boot)
- [x] JWT login + rotating refresh tokens (`POST /auth/refresh`)
- [x] Public registration (`POST /auth/register`, role forced to `member`, Zod-validated)
- [x] Google Sign-In (`POST /auth/google` — verifies the ID token against Google, `aud` must equal `GOOGLE_CLIENT_ID`; find-or-create member; 503 until configured)
- [x] Member-level access: reads on events/groups/cities/categories; create own events/groups (`created_by`/`owner_id` from JWT); update/delete own content (staff can manage all)
- [x] Event participation: `POST /events/:id/register` (atomic capacity check, server QR, free = confirmed / paid = pending) and `POST /events/:id/unregister`
- [x] Group membership: `POST /groups/:id/join` / `:id/leave` (`members` array + `member_count`; owner auto-member; owner cannot leave)
- [x] Tickets: `GET /tickets/mine` (event populated), `POST /tickets/checkin` (organizer/staff only; rejects used/cancelled), server-generated `LOKL-<uuid>` QR everywhere
- [x] Payments: read/update only — no create/delete routes (gateway-only writes by design)
- [x] Self profile: `PUT /users/me` (Zod whitelist — privileged fields can't sneak through), `PATCH /users/me/password` (requires current password)
- [x] CNDP: `GET /users/me/export` (full personal-data export) + `DELETE /users/me` (anonymization + ban + ticket cancellation)
- [x] Custom user admin endpoints: `PATCH /:id/role`, `PATCH /:id/ban`, password-hashing on create
- [x] Dashboard aggregate stats (counts + revenue + user growth chart)
- [x] MongoDB injection protection (sanitizeFilters, sanitizeBody)
- [x] Group chat: `GET /groups/mine`, `GET|POST /groups/:id/messages` (members only, sender populated, 1000-char cap)
- [x] Post-event reviews: `POST /events/:id/review` (attendee-only, after end, one per user), `GET /events/:id/reviews` (average + latest, flagged hidden)
- [x] Role separation: `requireSuperAdmin` on role-change and user-delete — moderators keep ban/unban and content moderation
- [x] Audit log: every successful staff write recorded (secrets redacted) → `GET /audit-logs` (staff, read-only)
- [x] Zod validation on event/group creation (in addition to auth + profile)
- [x] Seed script (admin + demo member + 6 cities + 8 categories)
- [x] Event chat: `GET|POST /events/:id/messages` (ticket holder with a non-cancelled ticket, or the organizer, or staff — enforced by `requireEventAccess`); `Message` now takes `event_id` OR `group_id` (never both, `pre('validate')`-enforced)
- [x] Auto-attend: creating an event issues its organizer a `used` ticket immediately (`registered_count` starts at 1) — no separate registration or QR scan needed for their own event
- [x] Inline photo upload: `image_url` (Event) / `cover_url` (Group) accept base64 `data:image/...;base64,...` URIs in addition to plain URLs (`IMAGE_URL` Zod schema, regex + 700k-char cap; `express.json({ limit: '1mb' })`) — stored directly in Mongo, no S3/R2
- [x] `category_id` on Event (previously only on Group) — required via Zod on create, optional at the schema level so pre-existing events without it still load/update; `GET /events?category_id=X` filters via the generic CRUD list

## What Is NOT Built Yet

- [ ] Payment gateway integration (CMI, CashPlus, Stripe) — paid-event tickets stay `pending`
- [ ] External file storage (S3/R2) — photos are inline base64 in Mongo instead (fine for pre-prod; revisit if documents approach the free-tier size cap)
- [ ] FCM push notifications
- [ ] Real-time chat transport — chat is REST + client polling (5s); swap in WebSocket/Socket.io later without changing the data model
- [ ] Geospatial queries (MongoDB `$geoNear`)
- [ ] Zod validation on update endpoints and remaining CRUD resources

---

## Known Bugs

All six previously-listed bugs are fixed (July 2026). See the root `CLAUDE.md` for the list.

---

## Environment Variables

See `.env.example` for all keys. Required at startup: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. Missing any throws on boot.

Optional: `GOOGLE_CLIENT_ID` (Google OAuth web client ID) — `POST /auth/google` returns 503 `GOOGLE_NOT_CONFIGURED` until it is set. The same value is passed to mobile via `--dart-define=GOOGLE_SERVER_CLIENT_ID=...` (see `mobile/CLAUDE.md`).

Also optional: `LOG_LEVEL` (default `info`), `SENTRY_DSN` (error tracking, no-op until set — see `src/config/sentry.js`), `TRUST_PROXY` (set to `1` behind a reverse proxy/load balancer in production).

---

## Production Readiness

- `GET /health` — unauthenticated, checks Mongo connection, returns 503 if degraded. Used by container orchestrators and uptime monitors.
- Logging is structured JSON via `pino`/`pino-http` in production (pretty-printed in dev). Auth headers, passwords, and refresh tokens are redacted automatically (`src/config/logger.js`).
- Graceful shutdown on `SIGTERM`/`SIGINT`: stops accepting new connections, lets in-flight requests finish, disconnects Mongo, then exits — required for zero-downtime deploys under Docker/Kubernetes.
- `Dockerfile` + `.dockerignore` present; runs as the non-root `node` user.
- Full checklist (secrets, hosting, Android signing, etc.) is in `DEPLOYMENT.md` at the repo root.

---

## Amounts Rule

- Store in **centimes** (integer): `25000` = 250.00 MAD
- Display as MAD: `(centimes / 100).toFixed(2) + ' MAD'`
- Commission (5%) calculated server-side only — never trust client amount

```ts
const COMMISSION_RATE = 0.05;
const commission_centimes = Math.round(amount_centimes * COMMISSION_RATE);
```
