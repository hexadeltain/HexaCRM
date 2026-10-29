# Tracking & analytics API

Full tracking of how users move through the HexaDelta terminal: sessions, pages and workspaces
visited, features used, symbols opened, scripts applied, articles read, and widgets seen or clicked.
The terminal (and optionally the landing site) sends events to one **ingest** endpoint. Admin
endpoints report on them overall, per article, per widget and per user (a user's full journey).

Conventions (auth, errors, pagination, date ranges) are in [README.md](README.md#shared-conventions).

---

## Identity

| Id | Made by | Lives in | Purpose |
| --- | --- | --- | --- |
| `anon_id` | client, UUID v4, once | `localStorage` (`hexa_anon_id`) | Every visitor, logged in or not |
| `session_id` | client, UUID v4 | `sessionStorage` + last-activity time | One visit. New one after **30 min** idle or at midnight IST |
| `user_id` | server, from the JWT | — | Logged-in account. **Never trusted from the body** |

On login (and on app start when already logged in) the client sends an `identify` event **with the
JWT**. The server stores `anon_id → user_id` in `tracking_identities`, and from then on attributes
events from that `anon_id` to the user, including earlier anonymous events (back-filled by a
background job). This also lets beacon requests, which can't carry the `Authorization` header, still
be attributed.

---

## Data model

```sql
-- Raw events. Partitioned by month; old partitions are dropped (see Retention).
CREATE TABLE tracking_events (
  id            BIGSERIAL,
  occurred_at   TIMESTAMPTZ  NOT NULL,         -- client time, clamped to [received_at - 24h, received_at + 5min]
  received_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  name          VARCHAR(64)  NOT NULL,         -- ^[a-z][a-z0-9_]{1,63}$
  user_id       BIGINT,                        -- null until identified
  anon_id       UUID         NOT NULL,
  session_id    UUID         NOT NULL,
  route         VARCHAR(300),                  -- path only, no query string
  platform      VARCHAR(12)  NOT NULL,         -- web | mobile_web | android | ios | site
  app_version   VARCHAR(40),
  country       CHAR(2),                       -- from IP at ingest; the IP itself is not stored
  region        VARCHAR(64),
  device_type   VARCHAR(10),                   -- desktop | mobile | tablet (from UA)
  browser       VARCHAR(40),
  os            VARCHAR(40),
  ref_type      VARCHAR(20),                   -- 'article' | 'widget' | 'symbol' | 'strategy' ... (copied from props for fast filters)
  ref_id        VARCHAR(80),                   -- article slug, widget id, symbol, strategy id
  props         JSONB        NOT NULL DEFAULT '{}',
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX ON tracking_events (user_id, occurred_at);
CREATE INDEX ON tracking_events (anon_id, occurred_at);
CREATE INDEX ON tracking_events (session_id, occurred_at);
CREATE INDEX ON tracking_events (name, occurred_at);
CREATE INDEX ON tracking_events (ref_type, ref_id, occurred_at);
-- Create next month's partition from a monthly cron, e.g. tracking_events_2026_11.

-- One row per session, upserted by the ingest (fast session lists without scanning events).
CREATE TABLE tracking_sessions (
  session_id    UUID PRIMARY KEY,
  anon_id       UUID         NOT NULL,
  user_id       BIGINT,
  started_at    TIMESTAMPTZ  NOT NULL,
  last_seen_at  TIMESTAMPTZ  NOT NULL,
  duration_s    INTEGER      NOT NULL DEFAULT 0,   -- last_seen_at - started_at
  event_count   INTEGER      NOT NULL DEFAULT 0,
  page_views    INTEGER      NOT NULL DEFAULT 0,
  entry_route   VARCHAR(300),
  exit_route    VARCHAR(300),
  platform      VARCHAR(12),
  app_version   VARCHAR(40),
  country       CHAR(2),
  device_type   VARCHAR(10),
  browser       VARCHAR(40),
  os            VARCHAR(40),
  referrer_host VARCHAR(200),
  utm           JSONB                             -- { source, medium, campaign, term, content }
);
CREATE INDEX ON tracking_sessions (user_id, started_at);
CREATE INDEX ON tracking_sessions (started_at);

CREATE TABLE tracking_identities (
  anon_id       UUID PRIMARY KEY,
  user_id       BIGINT       NOT NULL,
  first_seen_at TIMESTAMPTZ  NOT NULL,
  linked_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ON tracking_identities (user_id);

-- Per-user rollup, refreshed by the ingest / nightly job (powers user lists & summaries).
CREATE TABLE tracking_user_stats (
  user_id         BIGINT PRIMARY KEY,
  first_seen_at   TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ,
  sessions        INTEGER NOT NULL DEFAULT 0,
  total_time_s    BIGINT  NOT NULL DEFAULT 0,
  events          BIGINT  NOT NULL DEFAULT 0,
  last_platform   VARCHAR(12),
  last_route      VARCHAR(300)
);

-- Daily rollup for dashboards (nightly job + today computed live).
CREATE TABLE tracking_daily (
  day           DATE         NOT NULL,
  name          VARCHAR(64)  NOT NULL,
  platform      VARCHAR(12)  NOT NULL,
  ref_type      VARCHAR(20)  NOT NULL DEFAULT '',
  ref_id        VARCHAR(80)  NOT NULL DEFAULT '',
  events        INTEGER      NOT NULL,
  unique_users  INTEGER      NOT NULL,   -- distinct coalesce(user_id::text, anon_id::text)
  PRIMARY KEY (day, name, platform, ref_type, ref_id)
);

CREATE TABLE tracking_opt_outs (
  viewer_key    VARCHAR(64) PRIMARY KEY,  -- 'u:<user_id>' or 'a:<anon_id>'
  opted_out_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Volume guide: ~200 events per active user per day. At 10k DAU that's ~60M rows a month. Monthly
partitions plus the rollup tables keep dashboards fast. If it grows well beyond that, move
`tracking_events` to ClickHouse/Timescale and keep the same API.

---

## Event catalogue

Event names are fixed and documented here. New ones are added to this list first. `props` must
**not** contain personal data (email, phone, name, PAN), HexaLang script code, or order details.

| Event | When | `props` | `ref_type` / `ref_id` |
| --- | --- | --- | --- |
| `identify` | Login, and app start while logged in | — (user comes from JWT) | |
| `session_start` | First event of a session | `{ referrer, utm }` | |
| `page_view` | Route change / workspace opened | `{ title, prev_route }` | |
| `page_leave` | Route left or tab hidden | `{ seconds_visible }` | |
| `feature_used` | Generic feature action | `{ feature, action }` e.g. `{ "feature": "replay", "action": "start" }` | |
| `click` | Only elements marked `data-track="<id>"` (not every click) | `{ element, label }` | |
| `search` | Symbol / command search submitted | `{ query_length, results, source }` | |
| `symbol_open` | Symbol opened on a chart | `{ workspace, type }` | `symbol` / `NIFTY 50` |
| `timeframe_change` | Chart timeframe changed | `{ from, to }` | |
| `indicator_add` / `indicator_remove` | | `{ indicator, workspace }` | |
| `script_apply` | HexaLang script applied to a chart | `{ workspace, source }` (`editor` \| `builder` \| `marketplace` \| `saved`) | `strategy` / id |
| `strategy_save` / `scan_run` / `backtest_run` | | `{ workspace, universe_size }` | `strategy` / id |
| `layout_change` | Workspace layout switched | `{ layout }` | |
| `whats_new_open` | What's new drawer/popup opened | `{ unseen }` | |
| `article_impression` | Article row visible in the feed | `{ source, position }` | `article` / slug |
| `article_open` | Article opened | `{ source }` (`drawer` \| `popup` \| `widget` \| `link` \| `site`) | `article` / slug |
| `article_read` | Sent on leave of the article page | `{ read_pct, seconds }` | `article` / slug |
| `widget_impression` / `widget_click` / `widget_dismiss` | Written by `POST /widgets/{id}/events` | `{ placement, type }` | `widget` / id |
| `pricing_view` / `checkout_start` | | `{ plan, source }` | |
| `plan_purchase` | **Server-side only**, from the payment webhook | `{ plan, amount_bucket }` | |
| `signup` / `login` / `logout` | | `{ method }` | |
| `client_error` | Uncaught error / failed API call | `{ code, message (≤200 chars), endpoint }` | |

---

## Public endpoints

### `POST /api/v1/track` — ingest

Batched. The client queues events and sends them every 10 s, at 20 events, and on `pagehide` via
`navigator.sendBeacon`.

Headers: optional `Authorization: Bearer <JWT>`. Body as `application/json`, **or** `text/plain`
containing JSON (sendBeacon can't send JSON content-type without a CORS preflight).

```json
{
  "anon_id": "b3f6a3a2-6f0e-4b7a-9d55-2f1b8c9e4a10",
  "session_id": "6f1c1d2e-8a33-4b0b-a1f0-0c9d7f3e2b55",
  "context": {
    "platform": "web",
    "app_version": "2.4.0",
    "screen": { "w": 1920, "h": 1080 },
    "locale": "en-IN",
    "timezone": "Asia/Kolkata",
    "referrer": "https://www.google.com/",
    "utm": { "source": "newsletter", "campaign": "oct-release" }
  },
  "events": [
    { "name": "page_view", "ts": "2026-10-26T09:30:01.120Z", "route": "/chart-workspace",
      "props": { "title": "Chart workspace", "prev_route": "/" } },
    { "name": "symbol_open", "ts": "2026-10-26T09:30:04.900Z", "route": "/chart-workspace",
      "ref": { "type": "symbol", "id": "NIFTY 50" }, "props": { "workspace": "chart", "type": "INDEX" } }
  ]
}
```

```json
202
{ "accepted": 2, "rejected": [] }
```

Rules:
- Max **50 events** and **64 KB** per request (`413` beyond). `props` max 4 KB per event.
- Invalid events are dropped individually: `rejected: [{ "index": 3, "error": "unknown event name" }]`.
  The rest are still accepted.
- Unknown event names are rejected (the catalogue is the allow-list). Use `feature_used` for anything new until it is added.
- Strip query strings from `route` and `referrer` server-side (they can contain tokens).
- Viewer opted out (`tracking_opt_outs`) → `202 { "accepted": 0, "opted_out": true }` and nothing stored.
- Rate limit: 120 requests/min per `anon_id`, 600/min per IP → `429`.
- Enrich at ingest: country/region from IP (GeoLite2), UA parsing. **Do not store the IP.**
- Upsert `tracking_sessions` in the same request, and also update `tracking_user_stats` when `user_id` is known.
- CORS: allow the terminal origins (and `hexadelta.in` if the landing site sends events).

### `GET /api/v1/me/tracking` · `PUT /api/v1/me/tracking`

The user's own tracking preference (JWT or `X-Anon-Id`).

```json
GET → 200 { "tracking_enabled": true }
PUT   { "tracking_enabled": false }  → 200 { "tracking_enabled": false }
```

Opting out inserts into `tracking_opt_outs`. Strictly necessary data (auth, billing) is not affected.
The terminal should also stop sending events locally.

---

## Admin endpoints — analytics

All need `X-Admin-Key` (see the access note in [README.md](README.md#open-questions-for-the-team)).
All accept `from`, `to`, `tz`, and the filters `platform`, `plan`, `country` unless noted.
"Users" = distinct logged-in users plus distinct anonymous viewers. Responses include
`"users_basis": "all" | "logged_in"`, and `?basis=logged_in` restricts to accounts.

### `GET /api/v1/admin/analytics/overview`

```json
200
{
  "range": { "from": "2026-10-01", "to": "2026-10-26", "tz": "Asia/Kolkata" },
  "active_users": { "dau": 4120, "wau": 11850, "mau": 23010, "dau_mau": 0.179 },
  "new_users": 1834,
  "sessions": 61240,
  "avg_session_seconds": 812,
  "page_views": 402113,
  "top_routes":   [ { "route": "/chart-workspace", "views": 180221, "users": 9120 } ],
  "top_features": [ { "feature": "replay", "uses": 12011, "users": 2320 } ],
  "platforms":    [ { "platform": "web", "users": 15020, "share": 0.65 } ],
  "countries":    [ { "country": "IN", "users": 21900 } ],
  "compare_previous": { "dau": 0.08, "sessions": 0.12, "new_users": -0.03 }
}
```

`compare_previous` = relative change vs the same-length period before `from`.

### `GET /api/v1/admin/analytics/timeseries`

| Query | |
| --- | --- |
| `metric` | `active_users` \| `new_users` \| `sessions` \| `events` \| `avg_session_seconds` |
| `event` | required when `metric=events` (e.g. `script_apply`) |
| `ref_type`, `ref_id` | optional (e.g. one article) |
| `interval` | `hour` (ranges ≤ 7 days) \| `day` \| `week` \| `month` |
| `group_by` | optional: `platform` \| `plan` \| `country` → one series per value |

```json
200 { "metric": "active_users", "interval": "day",
      "series": [ { "key": "all", "points": [ { "t": "2026-10-25", "v": 4120 } ] } ] }
```

### `GET /api/v1/admin/analytics/events`

Every event name in range: `[{ "name", "events", "unique_users", "change_vs_previous" }]`.
`?name=script_apply&breakdown=props.source` breaks one event down by a prop
(only the props listed in the catalogue may be used as breakdowns).

### `GET /api/v1/admin/analytics/routes`

Per route: `views`, `unique_users`, `avg_seconds_visible`, `entries`, `exits`, `exit_rate`.

### `GET /api/v1/admin/analytics/flows`

How users move between pages, for a Sankey/path chart.

| Query | |
| --- | --- |
| `start_route` | optional; begin paths here (else session entry) |
| `steps` | 2–6, default 4 |
| `min_count` | hide links below this, default 20 |

```json
200 { "links": [ { "step": 1, "from": "/", "to": "/chart-workspace", "count": 8120 },
                 { "step": 2, "from": "/chart-workspace", "to": "/hexalang/create-strategy", "count": 1311 } ],
      "dropoffs": [ { "step": 2, "route": "/chart-workspace", "count": 4020 } ] }
```

### `POST /api/v1/admin/analytics/funnel`

POST because the steps go in the body.

```json
{ "from": "2026-10-01", "to": "2026-10-26", "window_hours": 24,
  "steps": [ { "name": "article_open", "ref_id": "hexalang-builder" },
             { "name": "page_view", "route": "/hexalang/builder" },
             { "name": "strategy_save" } ] }
```

```json
200 { "steps": [ { "users": 2400, "conversion": 1.0 }, { "users": 910, "conversion": 0.379 },
                 { "users": 302, "conversion": 0.126, "median_seconds_from_prev": 640 } ] }
```

Max 8 steps. A user counts for step N only if they did steps 1..N in order within `window_hours`.

### `GET /api/v1/admin/analytics/retention`

| Query | |
| --- | --- |
| `cohort` | `first_seen` \| `signup` (default `first_seen`) |
| `interval` | `day` \| `week` (default `week`) |
| `return_event` | what counts as coming back, default any `session_start` |

```json
200 { "cohorts": [ { "cohort": "2026-09-29", "size": 1802, "retained": [1.0, 0.41, 0.33, 0.29] } ] }
```

### `GET /api/v1/admin/analytics/articles`

Per article in range: `impressions`, `opens`, `unique_readers`, `open_rate` (opens ÷ impressions),
`avg_read_pct`, `avg_read_seconds`, `opens_by_source { drawer, popup, widget, link, site }`.
Filters: `category`, `section`. Sort: `?sort=opens|unique_readers|avg_read_pct`.

### `GET /api/v1/admin/analytics/articles/{id}`

One article: totals as above, plus `series` (daily opens/readers), `read_depth` histogram
(`0-25`, `25-50`, `50-75`, `75-100` %), `widgets` (its widgets with clicks → opens), `by_plan`,
`by_platform`, and the first page of `readers` (user id, opened_at, read_pct, source).
More readers: `GET /api/v1/admin/analytics/articles/{id}/readers?page=`.

### `GET /api/v1/admin/analytics/live`

Users active in the last 5 minutes. No date range. Poll every 15 s.

```json
200 { "active_now": 312, "by_route": [ { "route": "/chart-workspace", "users": 190 } ],
      "by_platform": [ { "platform": "web", "users": 240 } ], "events_last_minute": 1830 }
```

### `GET /api/v1/admin/analytics/export`

`?type=events|sessions&from&to&format=csv|ndjson` plus the usual filters. Streams the file
(`Content-Disposition: attachment`). Max range 31 days per export.

---

## Admin endpoints — users & sessions (user journey)

### `GET /api/v1/admin/users/activity`

User list for the tracking screen, from `tracking_user_stats` joined with the users table.
Query: `q` (user id / email search — resolved server-side, not stored in tracking), `active_since`,
`plan`, `platform`, `sort=last_seen|sessions|total_time`, paging.

Row: `{ user_id, email, plan, first_seen_at, last_seen_at, sessions, total_time_s, last_platform, last_route }`.

### `GET /api/v1/admin/users/{user_id}/summary`

```json
200
{
  "user_id": 101,
  "first_seen_at": "2026-03-02T10:11:00Z", "last_seen_at": "2026-10-26T09:31:12Z",
  "sessions": 412, "total_time_s": 391220, "avg_session_seconds": 949,
  "devices": [ { "platform": "web", "browser": "Chrome", "os": "Windows", "last_seen_at": "…" },
               { "platform": "android", "app_version": "2.3.1", "last_seen_at": "…" } ],
  "top_routes":   [ { "route": "/chart-workspace", "views": 3012 } ],
  "top_features": [ { "feature": "replay", "uses": 210 } ],
  "top_symbols":  [ { "symbol": "NIFTY 50", "opens": 812 } ],
  "articles_read": 18, "widgets": { "seen": 9, "clicked": 3, "dismissed": 4 },
  "linked_anon_ids": 3
}
```

### `GET /api/v1/admin/users/{user_id}/activity`

The user's timeline, newest first: `?from&to&name=&page&limit` (limit max 200).

```json
200 { "page": 1, "limit": 100, "total": 5210,
      "items": [ { "occurred_at": "2026-10-26T09:30:04.900Z", "name": "symbol_open", "route": "/chart-workspace",
                   "session_id": "6f1c…", "platform": "web", "ref_type": "symbol", "ref_id": "NIFTY 50",
                   "props": { "workspace": "chart", "type": "INDEX" } } ] }
```

### `GET /api/v1/admin/sessions`

`?user_id=&anon_id=&from&to&platform=&min_duration_s=&page` → rows from `tracking_sessions`.

### `GET /api/v1/admin/sessions/{session_id}`

The session row plus **all its events in order**, with `seconds_since_start` on each. That makes it
a step-by-step replay of one visit (pages, symbols, scripts, widgets).

### `DELETE /api/v1/admin/users/{user_id}/tracking`

Erasure request: deletes the user's `tracking_events` (all partitions), sessions, identities, stats and
widget state. Their anon ids go into `tracking_opt_outs`. Runs as a background job →
`202 { "job_id": "…" }`. `GET /api/v1/admin/jobs/{job_id}` reports progress. Every call is written to the admin audit log.

---

## Retention & privacy

- Raw `tracking_events`: **13 months**, then the monthly partition is dropped. Rollups
  (`tracking_daily`, `tracking_user_stats`) are kept, with no event-level detail.
- No IP addresses, no query strings, no personal data or script code in `props` (validated at ingest
  against the catalogue).
- Opt-out honoured server-side (`tracking_opt_outs`), and in the client.
- Show a tracking notice / consent in the terminal before the first non-essential event
  (needs compliance sign-off — DPDP Act 2023).
- Per-user endpoints (`/admin/users/...`, `/admin/sessions/...`, article readers) expose personal
  activity. Restrict them to admin roles that need them and audit-log access.

---

## Terminal tracker (outline)

A ~100-line module in the terminal, e.g. `src/features/tracking/`:

```js
// track("symbol_open", { workspace: "chart", type: "INDEX" }, { type: "symbol", id: "NIFTY 50" })
const queue = [];
export function track(name, props = {}, ref) {
  queue.push({ name, ts: new Date().toISOString(), route: location.pathname, props, ref });
  if (queue.length >= 20) flush();
}
function flush(useBeacon = false) {
  if (!queue.length || !isTrackingEnabled()) return;
  const body = JSON.stringify({ anon_id: getAnonId(), session_id: getSessionId(), context: getContext(), events: queue.splice(0, 50) });
  if (useBeacon && navigator.sendBeacon) navigator.sendBeacon(`${API}/api/v1/track`, body);   // text/plain
  else fetch(`${API}/api/v1/track`, { method: "POST", body, headers: authHeaders(), keepalive: true });
}
setInterval(flush, 10_000);
addEventListener("pagehide", () => flush(true));
```

- `page_view` from a router listener (one place, in `App.js`), not in each page.
- `identify` right after login and on startup when a JWT is present.
- Wire the existing What's new code (`features/whatsNew`) to send `whats_new_open`,
  `article_impression` and `article_open`.
