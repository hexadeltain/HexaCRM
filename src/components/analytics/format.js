// Shared formatting + the tracking event catalogue (Swagger → Tracking) for the analytics screens.

export const num = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'))

/** 0.179 → "17.9%" */
export const pct = (v, digits = 1) => (v == null ? '—' : `${(Number(v) * 100).toFixed(digits)}%`)

/** Relative change (0.08 → "+8.0%"), coloured by sign. */
export const delta = (v) => {
  if (v == null) return null
  const n = Number(v)
  return { text: `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`, up: n > 0, flat: n === 0 }
}

/** Seconds → "12m 4s" / "1h 02m". */
export const duration = (seconds) => {
  const s = Math.round(Number(seconds) || 0)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export const dateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? String(iso)
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const PLATFORM_OPTIONS = [
  { value: '', label: 'All platforms' },
  { value: 'web', label: 'Desktop web' },
  { value: 'mobile_web', label: 'Mobile web' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'site', label: 'Landing site' },
]

export const platformLabel = (p) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label || p || '—'

/** Event name → the props it may carry (the server's catalogue). Used for breakdowns and funnels. */
export const EVENT_CATALOGUE = {
  identify: [],
  session_start: ['referrer'],
  page_view: ['title', 'prev_route'],
  page_leave: ['seconds_visible'],
  feature_used: ['feature', 'action'],
  click: ['element', 'label'],
  search: ['query_length', 'results', 'source'],
  symbol_open: ['workspace', 'type'],
  timeframe_change: ['from', 'to'],
  indicator_add: ['indicator', 'workspace'],
  indicator_remove: ['indicator', 'workspace'],
  script_apply: ['workspace', 'source'],
  strategy_save: ['workspace', 'universe_size'],
  scan_run: ['workspace', 'universe_size'],
  backtest_run: ['workspace', 'universe_size'],
  layout_change: ['layout'],
  whats_new_open: ['unseen'],
  article_impression: ['source', 'position'],
  article_open: ['source', 'widget_id'],
  article_read: ['read_pct', 'seconds'],
  pricing_view: ['plan', 'source'],
  checkout_start: ['plan', 'source'],
  signup: ['method'],
  login: ['method'],
  logout: ['method'],
  client_error: ['code', 'endpoint'],
  widget_impression: ['placement', 'type'],
  widget_click: ['placement', 'type'],
  widget_dismiss: ['placement', 'type'],
  plan_purchase: ['plan'],
}

export const EVENT_OPTIONS = Object.keys(EVENT_CATALOGUE).map((name) => ({ value: name, label: name }))
