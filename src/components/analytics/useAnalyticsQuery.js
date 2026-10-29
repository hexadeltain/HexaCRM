import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs `load()` when `key` changes (a string of its inputs); a slower, older answer never
 * overwrites a newer one. Returns { data, loading, error, reload }.
 */
export function useAnalyticsQuery(load, key, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const requestRef = useRef(0)
  const loadRef = useRef(load)
  loadRef.current = load

  const run = useCallback(() => {
    const id = ++requestRef.current
    setState((s) => ({ ...s, loading: true, error: null }))
    loadRef
      .current()
      .then((data) => id === requestRef.current && setState({ data, loading: false, error: null }))
      .catch((err) => id === requestRef.current && setState((s) => ({ ...s, loading: false, error: err.message || String(err) })))
  }, [])

  useEffect(() => {
    if (enabled) run()
  }, [key, enabled, run])

  return { ...state, reload: run }
}
