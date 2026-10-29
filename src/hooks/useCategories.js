import { useCallback, useEffect, useState } from 'react'
import { fetchAdminCategories } from '../api'

// Every category (both sections, inactive too) shared by the editor, the article list and the
// Categories page. One request per session; `reload()` after a change.
let cache = null
let inflight = null
const listeners = new Set()

const load = () => {
  if (!inflight) {
    inflight = fetchAdminCategories()
      .then((data) => {
        cache = Array.isArray(data?.items) ? data.items : []
        listeners.forEach((l) => l(cache))
        return cache
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useCategories() {
  const [items, setItems] = useState(cache || [])
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    listeners.add(setItems)
    if (!cache) {
      load()
        .catch((err) => setError(err))
        .finally(() => setLoading(false))
    }
    return () => listeners.delete(setItems)
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    return load()
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { categories: items, loading, error, reload }
}

/** The category with this slug, or null (e.g. an article whose category was deleted). */
export const findCategory = (categories, slug) => categories.find((c) => c.slug === slug) || null
