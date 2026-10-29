# HexaDelta Admin

Admin panel for HexaDelta's content: product updates ("What's new") and blog articles. Content
written here is served by the backend at `https://lang.hexadelta.in` and shown in the HexaDelta
terminal (What's new drawer / dot) and on the website.

Built with React 19, Vite and Ant Design.

## Run it

```bash
npm install
npm run dev        # http://localhost:5174
npm run build      # production build in dist/
npm run lint       # oxlint
```

In dev, Vite proxies `/api` and `/uploads` to `https://lang.hexadelta.in` (see [vite.config.js](vite.config.js)),
so no CORS setup is needed locally.

## Connect to the backend

Open **Settings** in the navbar and set:

| Setting | Value |
| --- | --- |
| Backend API Base URL | leave empty on localhost (uses the proxy); otherwise e.g. `https://lang.hexadelta.in` |
| Admin Key | the backend's `INDICATOR_ADMIN_KEY`, sent as the `X-Admin-Key` header |

Both are kept in this browser's `localStorage` only. Use **Test Connection** to check them.

## Sections

The navbar switches between four sections.

| Section | What it does | Backend endpoints |
| --- | --- | --- |
| **Updates** | List, search and filter articles; create, edit, preview, publish now or schedule, archive; upload photos; "Add widget" on any update | `/api/v1/articles`, `/api/v1/admin/articles`, `/api/v1/admin/media` |
| **Categories** | Categories for product updates and for the blog: add, edit, colour, reorder, hide, delete (moving the articles first) | `/api/v1/admin/categories` |
| **Widgets** | Banners, toasts, modals, cards and spotlights shown in the terminal: create (blank or pre-filled from an update), target by placement / platform / plan / account age / user, schedule, cap frequency, activate / pause / end, stats per widget, "check a viewer" | `/api/v1/admin/widgets`, `/api/v1/admin/articles/{id}/widgets` |
| **Analytics** | Overview, live users, pages & paths, events, funnels, retention, article reading, users & session replays (audit-logged), data erase, raw export | `/api/v1/admin/analytics/*`, `/api/v1/admin/users/*`, `/api/v1/admin/sessions` |

All calls live in [src/api.js](src/api.js). Full backend docs: `<API URL>/docs` (e.g. `http://192.168.1.159:4100/docs`).

The events come from the terminal (`src/features/tracking` in HexaTerminal — platforms web, mobile_web,
android, ios) and the landing site (`src/features/tracking` in HexaLanding — platform site).

## Project layout

```
src/
├── api.js                         backend client (fetch + X-Admin-Key)
├── App.jsx                        section switch; articles list / editor
├── hooks/useCategories.js         categories shared by the editor, list and Categories page
├── components/
│   ├── ArticleList.jsx            table of articles by status
│   ├── ArticleEditor.jsx          editor: body, category, version, tags, cover, gallery, publish
│   ├── CategoriesPage.jsx
│   ├── widgets/                   WidgetsPage, WidgetFormDrawer, widgetOptions
│   ├── analytics/                 AnalyticsPage + one file per tab, LineChart, format helpers
│   ├── ArticlePreviewModal.jsx, DashboardStats.jsx, MediaUploadModal.jsx, Navbar.jsx
│   └── SettingsModal.jsx          API URL + admin key + test connection
└── utils/
    ├── markdown.js
    └── media.js                   upload URL normalisation
```

The API specs these screens were built from are in [docs/](docs/README.md).
