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
