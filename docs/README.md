# HexaDelta CMS — new backend APIs

Specs for the next round of backend work behind the admin panel (`hexadelta-admin`) and the
terminal's "What's new" feature. Three modules:

| Module | What it adds | Spec |
| --- | --- | --- |
| **Categories** | Categories become data instead of 4 hard-coded values; separate **blog** categories next to product-update ones. | [categories-api.md](categories-api.md) |
| **Widgets** | When an update is posted, the admin can attach in-app widgets (banner, popup, toast, card, spotlight) that the terminal shows to the right users. | [widgets-api.md](widgets-api.md) |
| **Tracking & analytics** | Every user's movement through the terminal (sessions, pages, features, articles read, widgets seen) is recorded, and admin APIs report on it per user, per article and overall. | [tracking-api.md](tracking-api.md) |

Each spec has: the data model (Postgres DDL), the **public** endpoints (called by the terminal /
landing site), the **admin** endpoints (called by this panel), and error cases.

---

## What already exists (do not break)

These are live on `https://lang.hexadelta.in` (Swagger: `/docs`) and are used by this panel
([src/api.js](../src/api.js)) and the terminal (`HexaTerminal/src/features/whatsNew/api.js`):

| Method | Path | Used by |
| --- | --- | --- |
| GET | `/api/v1/articles` | feed, admin list (`status` ≠ `live` needs admin key) |
| GET | `/api/v1/articles/{slug}` | article page, admin preview (`?preview=1`) |
| GET | `/api/v1/updates/latest` | terminal "What's new" dot / popup |
| POST | `/api/v1/admin/articles` | create draft |
| PATCH | `/api/v1/admin/articles/{id}` | edit, archive |
| POST | `/api/v1/admin/articles/{id}/publish` | publish now / schedule |
| POST | `/api/v1/admin/media` | photo upload |

Every change below to these endpoints is **additive** (new optional fields / query params).

---

## Shared conventions

All new endpoints follow the existing ones, so the clients need no new plumbing.

- **Base path:** public `/api/v1/...`, admin `/api/v1/admin/...`.
- **Admin auth:** `X-Admin-Key` header (`INDICATOR_ADMIN_KEY`), same as today. Missing/wrong key → `401`.
- **User auth (public endpoints):** optional `Authorization: Bearer <JWT>` — the same HS256 token
  `/api/chart/*` already accepts. The server takes `user_id` **only from the token**, never from the body.
- **Anonymous identity:** `X-Anon-Id: <uuid v4>` header, generated once by the client and kept in
  `localStorage`. Lets us track logged-out visitors and stitch them to the account after login.
- **Lists:** `?page=1&limit=20` → `{ "page": 1, "limit": 20, "total": 134, "items": [...] }`.
- **Errors:** `{ "error": "human readable message" }` with `400` (validation), `401`, `404`, `409`
  (conflict / slug taken), `413` (too large), `429` (rate limited), `500`.
- **PATCH:** only the fields sent change; `null` clears an optional field.
- **Dates:** ISO 8601 in responses (UTC). Inputs accept ISO, epoch seconds or epoch ms (as `/publish` does today).
- **Slugs:** `^[a-z0-9][a-z0-9-]{0,39}$` (same pattern `category` uses today).
- **Date ranges** (analytics): `?from=2026-10-01&to=2026-10-26` (inclusive, interpreted in `Asia/Kolkata`
  unless `tz=` is sent). Max range 366 days; default last 30 days.
- **Swagger:** add every new endpoint to the existing OpenAPI doc under new tags
  `Categories`, `Widgets`, `Tracking`, `Analytics`.

---

## Suggested build order

1. **Categories** — small, unblocks the content team right away.
2. **Tracking ingest** (`POST /api/v1/track`, identity, sessions) + the tracker in the terminal.
   Start collecting early; dashboards can come later and still show history.
3. **Widgets** — serving + events. Its stats come from the tracking tables.
4. **Analytics** admin endpoints + daily rollup job, then the admin panel screens.

## New admin-panel client functions

Once the endpoints exist, add these to [src/api.js](../src/api.js) using the existing `request()` helper:

| Function | Endpoint |
| --- | --- |
| `fetchCategories({ section })` | `GET /api/v1/admin/categories` |
| `createCategory(payload)` / `updateCategory(slug, payload)` / `deleteCategory(slug, moveTo)` | `POST` / `PATCH` / `DELETE /api/v1/admin/categories...` |
| `reorderCategories(slugs)` | `POST /api/v1/admin/categories/reorder` |
| `fetchWidgets(filters)` / `fetchWidget(id)` | `GET /api/v1/admin/widgets...` |
| `createWidgetFromArticle(articleId, overrides)` | `POST /api/v1/admin/articles/{id}/widgets` |
| `createWidget` / `updateWidget` / `setWidgetStatus(id, 'activate'\|'pause'\|'end')` | `/api/v1/admin/widgets...` |
| `fetchWidgetStats(id, range)` | `GET /api/v1/admin/widgets/{id}/stats` |
| `fetchAnalyticsOverview(range)` and the other `fetchAnalytics*` | `GET /api/v1/admin/analytics/...` |
| `fetchUserActivity(userId, range)` / `fetchUserSummary(userId)` | `GET /api/v1/admin/users/{id}/...` |

## Open questions for the team

1. **Database** — the specs assume Postgres (the chart-settings API already relies on `jsonb`). Say so if it's something else.
2. **Admin access to per-user data** — one shared `X-Admin-Key` gives anyone holding it every user's
   activity history. Recommended before go-live: per-admin accounts with roles (`editor` can manage
   content, only `analyst`/`owner` can read per-user tracking), plus an audit log of who viewed which user.
3. **Consent wording** — the tracking spec includes opt-out and erasure endpoints. The consent text in the
   terminal (DPDP Act 2023) needs sign-off from whoever owns legal/compliance.
4. **Landing site** — should the public site (`hexadelta.in` blog pages) send events to the same tracker?
   The ingest endpoint supports it (`platform: "site"`); it needs CORS for that origin.
