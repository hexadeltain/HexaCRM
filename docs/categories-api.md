# Categories API

Today the category is a free string on the article, and the editor offers four hard-coded values
(`feature`, `improvement`, `bugfix`, `announcement`). This module makes categories rows the admin
can create, rename, colour, reorder and retire, and adds a **section** so blog posts and product
updates each get their own set of categories.

Conventions (auth, errors, pagination) are in [README.md](README.md#shared-conventions).

---

## Data model

```sql
CREATE TABLE article_categories (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(40)  NOT NULL UNIQUE,          -- ^[a-z0-9][a-z0-9-]{0,39}$, what articles.category stores
  name         VARCHAR(60)  NOT NULL,                 -- "New Feature"
  description  VARCHAR(300),
  section      VARCHAR(20)  NOT NULL DEFAULT 'update' -- 'update' | 'blog'
               CHECK (section IN ('update', 'blog')),
  color        VARCHAR(20)  NOT NULL DEFAULT 'blue',  -- antd preset name or #hex
  icon         VARCHAR(40),                           -- optional icon key for the UI
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,    -- false = hidden from pickers and public list
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX article_categories_section_idx ON article_categories (section, sort_order);
```

`articles.category` keeps storing the **slug** (no type change, no FK migration needed). Renaming a
category changes `name`, never `slug`, so existing articles keep working.

### Seed (migration)

| slug | name | section | color |
| --- | --- | --- | --- |
| `feature` | New Feature | update | purple |
| `improvement` | Improvement | update | green |
| `bugfix` | Bug Fix | update | red |
| `announcement` | Announcement | update | geekblue |
| `update` | Update | update | blue — the current API default, keep it so old rows resolve |

Blog categories are created by the content team in the panel. Examples to seed if wanted:
`tutorials`, `strategy-ideas`, `market-insights`, `hexalang-guides`, `company-news`.

The migration must also insert any other distinct `articles.category` value already in the table
(`name` = title-cased slug, `section = 'update'`), so no existing article points at a missing category.

---

## Changes to existing article endpoints (additive)

| Endpoint | Change |
| --- | --- |
| `POST /api/v1/admin/articles`, `PATCH /api/v1/admin/articles/{id}` | `category` must be an existing, active slug → otherwise `400 {"error":"Unknown category 'xyz'"}`. |
| `GET /api/v1/articles` | New query param `section=update\|blog`. Filters through the article's category. Omitted = all sections (today's behaviour). |
| `GET /api/v1/articles`, `GET /api/v1/articles/{slug}`, `GET /api/v1/updates/latest` | Each row gains `category_info: { slug, name, color, icon, section }`. `category` (the slug) stays. |

`GET /api/v1/updates/latest` should only return `section = 'update'` articles, so blog posts don't
light up the terminal's "What's new" dot. (Say if blog posts should count too.)

---

## Public endpoints

### `GET /api/v1/categories`

Active categories, with how many **live** articles each has. Mirrors `GET /indicators/categories`.

| Query | Default | |
| --- | --- | --- |
| `section` | all | `update` or `blog` |
| `include_empty` | `false` | `true` also returns categories with 0 live articles |

```json
200
{
  "items": [
    { "slug": "feature", "name": "New Feature", "description": null, "section": "update",
      "color": "purple", "icon": "rocket", "sort_order": 0, "count": 14 },
    { "slug": "tutorials", "name": "Tutorials", "description": "Step-by-step guides", "section": "blog",
      "color": "cyan", "icon": "book", "sort_order": 0, "count": 6 }
  ]
}
```

Ordered by `section`, then `sort_order`, then `name`. Cache-friendly: `Cache-Control: public, max-age=300`.

---

## Admin endpoints

All need `X-Admin-Key`.

### `GET /api/v1/admin/categories`

Every category, including inactive ones, with counts per status.

Query: `section` (optional).

```json
200
{
  "items": [
    { "id": 1, "slug": "feature", "name": "New Feature", "description": null, "section": "update",
      "color": "purple", "icon": "rocket", "sort_order": 0, "is_active": true,
      "counts": { "draft": 2, "published": 14, "scheduled": 1, "archived": 3 },
      "created_at": "2026-10-26T06:00:00.000Z", "updated_at": "2026-10-26T06:00:00.000Z" }
  ]
}
```

### `POST /api/v1/admin/categories`

```json
{ "name": "Tutorials", "slug": "tutorials", "section": "blog", "color": "cyan",
  "icon": "book", "description": "Step-by-step guides" }
```

Only `name` is required. `slug` defaults to slugified `name`, `section` to `update`, `sort_order` to
last in its section. → `201 { "category": {...} }`. Taken slug → `409`.

### `PATCH /api/v1/admin/categories/{slug}`

Any of `name`, `description`, `section`, `color`, `icon`, `sort_order`, `is_active`.
`slug` is **not** editable (articles reference it) → `400` if sent.
→ `200 { "ok": true, "category": {...} }`.

Setting `is_active: false` hides it from the public list and from new-article pickers. Articles already in it stay live.

### `DELETE /api/v1/admin/categories/{slug}?move_to={otherSlug}`

- No articles use it → deleted, `200 { "ok": true, "moved": 0 }`.
- Articles use it and no `move_to` → `409 { "error": "12 articles use this category", "count": 12 }`.
- With `move_to` → those articles are moved in the same transaction, then the category is deleted:
  `200 { "ok": true, "moved": 12 }`. Unknown `move_to` → `400`.

### `POST /api/v1/admin/categories/reorder`

```json
{ "section": "blog", "slugs": ["tutorials", "strategy-ideas", "market-insights"] }
```

Sets `sort_order` to each slug's index. Slugs not listed keep their order after the listed ones.
→ `200 { "ok": true }`.

---

## Admin panel follow-up

- [ArticleEditor.jsx](../src/components/ArticleEditor.jsx): replace the hard-coded `Radio.Group`
  with options loaded from `GET /api/v1/admin/categories?section=…` (render `color` as the `Tag` colour),
  and add a **Section** switch (Product update / Blog) above it.
- New **Categories** screen: table with drag-to-reorder, add/edit modal, deactivate, and delete with
  a "move articles to…" picker when the `409` comes back.
