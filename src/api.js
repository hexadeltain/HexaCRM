// HexaDelta Admin API Client
//http://192.168.1.159:4100
const STORAGE_KEY_API_URL = 'hexadelta_admin_api_url'
const STORAGE_KEY_ADMIN_KEY = 'hexadelta_admin_key'

// Default to local proxy in dev, falling back to direct server address
const DEFAULT_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' 
  : 'https://lang.hexadelta.in'

export function getApiConfig() {
  return {
    apiUrl: localStorage.getItem(STORAGE_KEY_API_URL) || DEFAULT_API_URL,
    adminKey: localStorage.getItem(STORAGE_KEY_ADMIN_KEY) || '',
  }
}

export function saveApiConfig({ apiUrl, adminKey }) {
  if (apiUrl !== undefined) {
    localStorage.setItem(STORAGE_KEY_API_URL, apiUrl.trim().replace(/\/+$/, ''))
  }
  if (adminKey !== undefined) {
    localStorage.setItem(STORAGE_KEY_ADMIN_KEY, adminKey.trim())
  }
}

async function request(endpoint, options = {}) {
  const { apiUrl, adminKey } = getApiConfig()
  const base = apiUrl ? apiUrl.replace(/\/+$/, '') : ''
  const url = `${base}${endpoint}`

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (adminKey) {
    headers['X-Admin-Key'] = adminKey
  }

  // If body is plain object, serialize JSON and set header
  let body = options.body
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      body,
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`
      const error = new Error(errorMsg)
      error.status = res.status
      error.data = data
      throw error
    }

    return data
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err)
    throw err
  }
}

// 1. Fetch articles list (Drafts, Published, Scheduled, Archived)
export async function fetchArticles({ page = 1, limit = 50, category, tag, q, status = 'all' } = {}) {
  const params = new URLSearchParams()
  if (page) params.append('page', page)
  if (limit) params.append('limit', limit)
  if (status) params.append('status', status)
  if (category) params.append('category', category)
  if (tag) params.append('tag', tag)
  if (q) params.append('q', q)

  return request(`/api/v1/articles?${params.toString()}`)
}

// 2. Fetch single article by slug or ID with draft/preview support
export async function fetchArticle(slugOrId, preview = true) {
  const query = preview ? '?preview=1' : ''
  return request(`/api/v1/articles/${encodeURIComponent(slugOrId)}${query}`)
}

// 3. Create a new article (always saved as DRAFT initially)
export async function createArticle(payload) {
  return request('/api/v1/admin/articles', {
    method: 'POST',
    body: payload,
  })
}

// 4. Update an existing article
export async function updateArticle(id, payload) {
  return request(`/api/v1/admin/articles/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

// 5. Publish an article immediately or schedule for a future date
// If publishedAt is null/empty -> publishes immediately
// If publishedAt is a future ISO date string -> schedules it
export async function publishArticle(id, publishedAt = null) {
  const body = publishedAt ? { published_at: publishedAt } : {}
  return request(`/api/v1/admin/articles/${id}/publish`, {
    method: 'POST',
    body,
  })
}

// 6. Upload media photo (PNG, JPEG, GIF, WebP)
export async function uploadMedia(file, alt = '') {
  const formData = new FormData()
  formData.append('file', file)
  if (alt) {
    formData.append('alt', alt)
  }

  return request('/api/v1/admin/media', {
    method: 'POST',
    body: formData,
  })
}

// 7. Latest updates popup feed
export async function fetchLatestUpdates({ limit = 5, since = null } = {}) {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit)
  if (since) params.append('since', since)
  return request(`/api/v1/updates/latest?${params.toString()}`)
}

// 8. Test connection
export async function testConnection() {
  try {
    const start = Date.now()
    const data = await fetchArticles({ limit: 1, status: 'all' })
    const ping = Date.now() - start
    return { ok: true, ping, data }
  } catch (err) {
    return { ok: false, error: err.message, status: err.status }
  }
}

// Query string from an object, skipping empty values.
const qs = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, value)
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

// ── Categories ─────────────────────────────────────────────────────────────
// section: 'update' (product updates — the terminal's What's new) | 'blog'

// 9. Every category (inactive too) with article counts per status
export async function fetchAdminCategories({ section } = {}) {
  return request(`/api/v1/admin/categories${qs({ section })}`)
}

// 10. Create — only `name` is required; slug defaults to the slugified name
export async function createCategory(payload) {
  return request('/api/v1/admin/categories', { method: 'POST', body: payload })
}

// 11. Update — the slug can't change (articles reference it)
export async function updateCategory(slug, payload) {
  return request(`/api/v1/admin/categories/${encodeURIComponent(slug)}`, { method: 'PATCH', body: payload })
}

// 12. Set the order within a section (slugs in display order)
export async function reorderCategories(section, slugs) {
  return request('/api/v1/admin/categories/reorder', { method: 'POST', body: { section, slugs } })
}

// 13. Delete — 409 while articles use it, unless `moveTo` moves them first
export async function deleteCategory(slug, moveTo) {
  return request(`/api/v1/admin/categories/${encodeURIComponent(slug)}${qs({ move_to: moveTo })}`, {
    method: 'DELETE',
  })
}

// ── Widgets ────────────────────────────────────────────────────────────────

// 14. List with all-time stats — filters: status, article_id, placement, type, live, page, limit
export async function fetchWidgets(filters = {}) {
  return request(`/api/v1/admin/widgets${qs({ status: 'all', limit: 50, ...filters })}`)
}

// 15. One widget, its stats summary and why it is (not) being served
export async function fetchWidget(id) {
  return request(`/api/v1/admin/widgets/${id}`)
}

// 16. Create (DRAFT unless `activate: true`)
export async function createWidget(payload) {
  return request('/api/v1/admin/widgets', { method: 'POST', body: payload })
}

// 17. Create pre-filled from an article (title, summary, cover, schedule)
export async function createArticleWidget(articleId, payload) {
  return request(`/api/v1/admin/articles/${articleId}/widgets`, { method: 'POST', body: payload })
}

// 18. Change any field (`reset_viewer_state: true` shows it to everyone again)
export async function updateWidget(id, payload) {
  return request(`/api/v1/admin/widgets/${id}`, { method: 'PATCH', body: payload })
}

// 19. Status changes: 'activate' | 'pause' | 'end'
export async function setWidgetStatus(id, action) {
  return request(`/api/v1/admin/widgets/${id}/${action}`, { method: 'POST' })
}

// 20. Delete a DRAFT (others: end them to keep their stats)
export async function deleteWidget(id) {
  return request(`/api/v1/admin/widgets/${id}`, { method: 'DELETE' })
}

// 21. Totals, by placement / platform / plan, and a series — from, to, tz, interval (hour|day)
export async function fetchWidgetStats(id, params = {}) {
  return request(`/api/v1/admin/widgets/${id}/stats${qs(params)}`)
}

// 22. What a given viewer would be served, plus why the rest were skipped
export async function previewWidgets(params) {
  return request(`/api/v1/admin/widgets/preview${qs(params)}`)
}

// ── Analytics ──────────────────────────────────────────────────────────────
// Shared filters: from, to (YYYY-MM-DD), tz, platform, plan, country, basis (all|logged_in)

export const fetchAnalyticsOverview = (params) => request(`/api/v1/admin/analytics/overview${qs(params)}`)
export const fetchAnalyticsTimeseries = (params) => request(`/api/v1/admin/analytics/timeseries${qs(params)}`)
export const fetchAnalyticsEvents = (params) => request(`/api/v1/admin/analytics/events${qs(params)}`)
export const fetchAnalyticsRoutes = (params) => request(`/api/v1/admin/analytics/routes${qs(params)}`)
export const fetchAnalyticsFlows = (params) => request(`/api/v1/admin/analytics/flows${qs(params)}`)
export const fetchAnalyticsRetention = (params) => request(`/api/v1/admin/analytics/retention${qs(params)}`)
export const fetchAnalyticsArticles = (params) => request(`/api/v1/admin/analytics/articles${qs(params)}`)
export const fetchAnalyticsArticle = (id, params) =>
  request(`/api/v1/admin/analytics/articles/${encodeURIComponent(id)}${qs(params)}`)
export const fetchAnalyticsLive = () => request('/api/v1/admin/analytics/live')

// Funnel: { from, to, tz, window_hours, steps: [{ name, ref_id?, route? }] } — 2 to 8 steps
export const fetchAnalyticsFunnel = (body) =>
  request('/api/v1/admin/analytics/funnel', { method: 'POST', body })

// ── Users & sessions (audit-logged on the server) ──────────────────────────

export const fetchUsersActivity = (params) => request(`/api/v1/admin/users/activity${qs(params)}`)
export const fetchUserSummary = (userId) => request(`/api/v1/admin/users/${encodeURIComponent(userId)}/summary`)
export const fetchUserActivity = (userId, params) =>
  request(`/api/v1/admin/users/${encodeURIComponent(userId)}/activity${qs(params)}`)
export const fetchSessions = (params) => request(`/api/v1/admin/sessions${qs(params)}`)
export const fetchSession = (sessionId) => request(`/api/v1/admin/sessions/${encodeURIComponent(sessionId)}`)

// Erase a user's tracking data — returns { job_id }; poll fetchJob until DONE / FAILED
export const eraseUserTracking = (userId) =>
  request(`/api/v1/admin/users/${encodeURIComponent(userId)}/tracking`, { method: 'DELETE' })
export const fetchJob = (jobId) => request(`/api/v1/admin/jobs/${encodeURIComponent(jobId)}`)

// 23. Raw export as a file download — type: events|sessions, format: csv|ndjson, max 31 days
export async function downloadAnalyticsExport(params) {
  const { apiUrl, adminKey } = getApiConfig()
  const base = apiUrl ? apiUrl.replace(/\/+$/, '') : ''
  const res = await fetch(`${base}/api/v1/admin/analytics/export${qs(params)}`, {
    headers: adminKey ? { 'X-Admin-Key': adminKey } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || data?.message || `Export failed with status ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hexadelta-${params.type || 'events'}-${params.from}-to-${params.to}.${params.format || 'csv'}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
