# Widgets API

When a product update is posted, the admin can attach one or more **widgets**. Widgets are small
in-app units the terminal shows to the right users at the right place, for example a banner on the
chart workspace saying "New: drawings sync across devices → Read more". The server decides who
sees what (audience, schedule, frequency caps). The terminal only asks for widgets and reports
what happened to them. Those reports feed the stats here and the tracking module
([tracking-api.md](tracking-api.md)).

Conventions (auth, errors, pagination) are in [README.md](README.md#shared-conventions).

---

## Concepts

**Type** — how it looks:

| type | Shown as | Typical use |
| --- | --- | --- |
| `banner` | Thin strip across the top of a workspace | Big launches |
| `modal` | Centred popup with image + CTA | Major release, once per user |
| `toast` | Small corner notification, auto-hides | Minor improvements |
| `card` | Card inside the What's new drawer / a sidebar | Ongoing promos |
| `spotlight` | Tooltip anchored to a UI element (`anchor`) with a pulse | "This button is new" |

**Placement** — where it can appear. Fixed keys the terminal knows:
`global`, `dashboard`, `chart_workspace`, `screener_workspace`, `hexalang_editor`, `whats_new_drawer`,
`mobile_home`, `mobile_chart`. A widget lists one or more.

**Anchor** (spotlight only) — a stable id the terminal puts on the element, e.g.
`data-widget-anchor="chart-replay-button"`. If the anchor isn't on screen, the widget is skipped.

**Audience** — who is eligible: plans, platforms, logged-in vs anonymous, account age, explicit user ids.

**Frequency** — how often one viewer sees it, and what retires it for them (dismiss / click / N impressions).

**Status** — `DRAFT` → `ACTIVE` ⇄ `PAUSED` → `ENDED`. Only `ACTIVE` widgets inside their
`starts_at`/`ends_at` window are served. If the widget is linked to an article, it is also only served
while that article is **live** (a widget made for a scheduled article waits for the article).

---

## Data model

```sql
CREATE TABLE widgets (
  id              SERIAL PRIMARY KEY,
  article_id      INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  name            VARCHAR(120) NOT NULL,              -- internal label, not shown to users
  type            VARCHAR(20)  NOT NULL CHECK (type IN ('banner','modal','toast','card','spotlight')),
  status          VARCHAR(10)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','ENDED')),

  -- content
  title           VARCHAR(120) NOT NULL,
  body            VARCHAR(600),                       -- short markdown
  media_id        INTEGER REFERENCES media(id) ON DELETE SET NULL,
  cta_label       VARCHAR(40),
  cta_url         VARCHAR(500),                       -- null + article_id → opens the article
  theme           VARCHAR(20)  NOT NULL DEFAULT 'brand', -- 'brand' | 'info' | 'success' | 'warning'

  -- where
  placements      TEXT[]       NOT NULL,              -- {chart_workspace, screener_workspace}
  anchor          VARCHAR(80),                        -- spotlight only
  platforms       TEXT[]       NOT NULL DEFAULT '{web,mobile_web,android,ios}',

  -- who
  audience        JSONB        NOT NULL DEFAULT '{}', -- see "Audience" below

  -- when / how often
  starts_at       TIMESTAMPTZ,                        -- null = when activated
  ends_at         TIMESTAMPTZ,                        -- null = no end
  priority        INTEGER      NOT NULL DEFAULT 0,    -- higher wins when several compete for one slot
  frequency       JSONB        NOT NULL DEFAULT '{"max_impressions":3,"min_hours_between":24,"dismissible":true,"retire_on":"dismiss"}',

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX widgets_serving_idx ON widgets (status, starts_at, ends_at);
CREATE INDEX widgets_article_idx ON widgets (article_id);

-- One row per viewer per widget: drives frequency caps and "already dismissed".
CREATE TABLE widget_viewer_state (
  widget_id       INTEGER      NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  viewer_key      VARCHAR(64)  NOT NULL,              -- 'u:<user_id>' or 'a:<anon_id>'
  impressions     INTEGER      NOT NULL DEFAULT 0,
  first_seen_at   TIMESTAMPTZ,
  last_seen_at    TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  PRIMARY KEY (widget_id, viewer_key)
);
```

When an anonymous viewer logs in (tracking `identify`), merge their `a:<anon_id>` rows into
`u:<user_id>` (sum impressions, keep earliest/latest dates) so they don't see the same modal twice.

### Audience (`audience` JSONB)

```json
{
  "auth": "any",                    // "any" | "logged_in" | "anonymous"
  "plans": ["free", "pro"],         // omit = all plans
  "exclude_plans": ["enterprise"],
  "account_age_days": { "max": 7 }, // only users who signed up in the last 7 days ({ "min": 30 } = older users)
  "user_ids": [101, 202],           // explicit allow-list (beta testers); omit = everyone matching the rest
  "has_used_feature": "hexalang",   // optional: tracking event-based, e.g. users who ran a script before
  "not_seen_article": true          // skip users who already opened the linked article
}
```

Every key is optional. An empty object means everyone. Rules are ANDed.

### Frequency (`frequency` JSONB)

```json
{
  "max_impressions": 3,       // per viewer, lifetime of the widget (null = unlimited)
  "min_hours_between": 24,    // gap between two impressions for the same viewer
  "dismissible": true,        // shows a close button
  "retire_on": "dismiss"      // "dismiss" | "click" | "dismiss_or_click" | "never" — stops showing after this
}
```

---

## Public endpoints (terminal)

Auth: optional `Authorization: Bearer <JWT>` + `X-Anon-Id` (one of the two is required, else `400`).

### `GET /api/v1/widgets/active`

What this viewer should see **now** at a placement. The server applies status, schedule, linked-article
liveness, platform, audience and frequency.

| Query | |
| --- | --- |
| `placement` | required, one key or comma-separated (`chart_workspace,global`) |
| `platform` | required: `web` \| `mobile_web` \| `android` \| `ios` |
| `app_version` | optional, for future version targeting |

```json
200
{
  "items": [
    {
      "id": 7,
      "type": "banner",
      "placement": "chart_workspace",
      "title": "Your drawings now sync across devices",
      "body": "Draw on desktop, pick up on mobile.",
      "media": { "id": 3, "url": "https://lang.hexadelta.in/uploads/mgz1k2.png", "width": 1280, "height": 720, "alt": null },
      "cta_label": "Read more",
      "cta_url": null,
      "article": { "id": 12, "slug": "chart-drawings-sync", "title": "Your chart drawings now sync across devices" },
      "theme": "brand",
      "anchor": null,
      "dismissible": true,
      "priority": 10
    }
  ],
  "refresh_after_seconds": 300
}
```

Serving rules:
- At most **one** `modal` and one `banner` per placement in a response (highest `priority`, then newest).
  `toast`, `card` and `spotlight` can be several (cap 3 each).
- Returning a widget here does **not** count as an impression. The client reports that when it is actually on screen.
- `refresh_after_seconds` tells the client when to poll again (also re-poll on route change).
- `Cache-Control: private, no-store` (answer depends on the viewer).

### `POST /api/v1/widgets/{id}/events`

Report what happened to a widget. Updates `widget_viewer_state` **and** writes the matching tracking
event (`widget_impression` / `widget_click` / `widget_dismiss`) into `tracking_events`.

```json
{ "event": "impression", "placement": "chart_workspace", "session_id": "6f1c…", "route": "/chart-workspace" }
```

`event`: `impression` | `click` | `dismiss`. Impressions for the same viewer + widget within 30 minutes
are deduplicated (state not incremented twice).

→ `204`. Unknown widget → `404`. Also accepted as `text/plain` JSON so it works with `navigator.sendBeacon`.

---

## Admin endpoints

All need `X-Admin-Key`.

### `GET /api/v1/admin/widgets`

| Query | |
| --- | --- |
| `status` | `DRAFT` \| `ACTIVE` \| `PAUSED` \| `ENDED` \| `all` (default `all`) |
| `article_id` | widgets of one article |
| `placement`, `type` | filters |
| `live` | `true` = only the ones being served right now |
| `page`, `limit` | paging (default 20, max 100) |

Rows = the widget + `stats_summary: { impressions, unique_viewers, clicks, ctr, dismisses }` (all time).

### `GET /api/v1/admin/widgets/{id}`

Full widget, linked article (`id`, `slug`, `title`, `status`, `published_at`), `stats_summary`, and
`serving: { is_live: false, reason: "article_scheduled" }`. `reason` is one of `not_active`,
`not_started`, `ended`, `article_not_live`, or `null` when live. It answers "why isn't my widget showing?".

### `POST /api/v1/admin/widgets`

Body = any writable column (`name`, `type`, `title`, `placements` required). `status` starts as `DRAFT`
unless `"activate": true` is sent. → `201 { "widget": {...} }`.

Validation: `spotlight` needs `anchor`; `modal`/`banner`/`card` need `title`; `cta_url` must be
`https://` or an in-app path starting with `/`; `placements` must be known keys; `ends_at > starts_at`.

### `POST /api/v1/admin/articles/{id}/widgets`

**The "add a widget when posting an update" shortcut.** Creates a widget pre-filled from the article.
Anything sent overrides the defaults:

| Field | Default from the article |
| --- | --- |
| `name` | `"<article title> — <type>"` |
| `title` | article `title` |
| `body` | article `summary` |
| `media_id` | article cover |
| `cta_label` | `"Read more"` |
| `cta_url` | `null` (opens the article) |
| `starts_at` | article `published_at` (so a scheduled article's widget starts with it) |
| `ends_at` | `starts_at + 14 days` |

```json
{ "type": "banner", "placements": ["chart_workspace", "screener_workspace"],
  "audience": { "plans": ["free"] }, "activate": true }
```

→ `201 { "widget": {...} }`. Several widgets per article are fine, for example a modal for new users plus a toast for everyone else.

Optionally, the existing `POST /api/v1/admin/articles/{id}/publish` can accept
`"widgets": [ {…same body…} ]` and create them in the same transaction, so the editor's
"Publish" button can do both in one call.

### `PATCH /api/v1/admin/widgets/{id}`

Change any writable field. Editing content of an `ACTIVE` widget applies on the next poll.
Changing `audience`/`frequency` does not reset viewer state. Send `"reset_viewer_state": true` to
show it again to everyone.

### `POST /api/v1/admin/widgets/{id}/activate` · `/pause` · `/end`

Status transitions. `activate` on an `ENDED` widget → `409`. → `200 { "ok": true, "widget": {...} }`.

### `DELETE /api/v1/admin/widgets/{id}`

Only `DRAFT` widgets (never shown, no stats). Others → `409` — use `/end` to keep their stats.

### `GET /api/v1/admin/widgets/{id}/stats`

| Query | |
| --- | --- |
| `from`, `to` | date range (default: widget's lifetime) |
| `interval` | `hour` \| `day` (default `day`) |

```json
200
{
  "totals": { "impressions": 18234, "unique_viewers": 6120, "clicks": 911, "ctr": 0.1489,
              "dismisses": 2302, "article_opens_from_widget": 870 },
  "by_placement": [ { "placement": "chart_workspace", "impressions": 12011, "clicks": 702 } ],
  "by_platform":  [ { "platform": "web", "impressions": 15002, "clicks": 820 } ],
  "by_plan":      [ { "plan": "free", "impressions": 14020, "clicks": 640 } ],
  "series": [ { "t": "2026-10-20", "impressions": 4022, "clicks": 210, "dismisses": 480 } ]
}
```

`ctr` = clicks ÷ unique viewers. Computed from `tracking_events` (`widget_*` rows).

### `GET /api/v1/admin/widgets/preview?user_id=101&placement=chart_workspace&platform=web`

Runs the serving logic as that user would, **without** touching their state. Returns
the same shape as `/widgets/active`, plus for every non-served widget a `skipped: [{ id, reason }]`
(`audience_plan`, `frequency_cap`, `dismissed`, `platform`, …). Used by the panel to debug targeting.

---

## Terminal integration (outline)

1. On mount of each workspace (and on route change), call `/widgets/active` with that workspace's placement.
2. Render by `type`. When ≥ 50 % of the widget is visible for 1 s, send `impression` (once per mount).
3. CTA → send `click`, then open `cta_url`, or the article page when it's `null`. Close button → `dismiss`.
4. Spotlight: look up `[data-widget-anchor="<anchor>"]`; if missing, don't render and don't send an impression.
5. Never show a `modal` while another modal (pricing, login, etc.) is open. Queue it for the next poll.
