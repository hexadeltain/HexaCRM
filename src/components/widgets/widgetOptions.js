// Fixed values the widgets API accepts (Swagger → Widgets).

export const WIDGET_TYPES = [
  { value: 'banner', label: 'Banner', hint: 'Slim bar along the bottom of the page' },
  { value: 'toast', label: 'Toast', hint: 'Corner notification, hides after 12 s' },
  { value: 'modal', label: 'Modal', hint: 'Centred popup with image — big launches' },
  { value: 'card', label: 'Card', hint: "Inline in What's new / mobile home; floats bottom-right on other pages" },
  { value: 'spotlight', label: 'Spotlight', hint: 'Points at one button (needs an anchor)' },
]

export const PLACEMENTS = [
  { value: 'global', label: 'Everywhere (global)' },
  { value: 'dashboard', label: 'Dashboard (desktop home)' },
  { value: 'chart_workspace', label: 'Chart workspace' },
  { value: 'screener_workspace', label: 'Screener / HexaLang workspace' },
  { value: 'whats_new_drawer', label: "What's new drawer" },
  { value: 'mobile_home', label: 'Mobile home' },
  { value: 'mobile_chart', label: 'Mobile chart' },
{ value: 'hexalang_editor', label: 'HexaLang editor' },
]

export const PLATFORMS = [
  { value: 'web', label: 'Desktop web' },
  { value: 'mobile_web', label: 'Mobile web' },
  { value: 'android', label: 'Android app' },
  { value: 'ios', label: 'iOS app' },
]

export const PLANS = ['FREE', 'BASIC', 'STANDARD', 'PRO']

export const RETIRE_ON = [
  { value: 'dismiss', label: 'After it is dismissed' },
  { value: 'click', label: 'After it is clicked' },
  { value: 'dismiss_or_click', label: 'After a dismiss or a click' },
  { value: 'never', label: 'Never (only the impression cap)' },
]

export const STATUS_COLORS = { DRAFT: 'default', ACTIVE: 'green', PAUSED: 'orange', ENDED: 'red' }

export const SERVING_REASONS = {
  not_active: 'Not active',
  not_started: 'Starts later',
  ended: 'Past its end date',
  article_not_live: 'Waiting for its article to go live',
}

export const SKIP_REASONS = {
  placement: 'Not for this placement',
  audience_auth: 'Logged-in / anonymous rule',
  audience_plan: 'Plan not targeted',
  audience_account_age: 'Account age outside the range',
  audience_user: 'Not in the user list',
  audience_feature: "Hasn't used the required feature",
  already_read_article: 'Already read the article',
  dismissed: 'Dismissed it',
  clicked: 'Clicked it already',
  frequency_cap: 'Saw it the maximum number of times',
  frequency_gap: 'Saw it too recently',
  slot_taken: 'A higher-priority widget took the slot',
}

// Spotlight anchors the terminal knows (keep in sync with HexaTerminal/src/features/widgets/anchors.js).
const anchor = (value, name) => ({ value, label: `${name} — ${value}` })
export const ANCHORS = [
  {
    label: 'Chart workspace · right rail',
    options: [
      anchor('chart-profile', 'Profile / login'),
      anchor('chart-watchlist', 'Watchlist'),
      anchor('chart-market-overview', 'Market overview'),
      anchor('chart-option-chain', 'Option chain'),
      anchor('chart-news', 'News'),
      anchor('chart-screener', 'Screener'),
      anchor('chart-calendar', 'Calendar'),
      anchor('chart-request-access', 'Request access'),
      anchor('chart-layout', 'Chart layout'),
    ],
  },
  {
    label: 'Chart workspace · header toolbar',
    options: [
      anchor('chart-symbol-search', 'Symbol search'),
      anchor('chart-type', 'Chart type'),
      anchor('chart-indicators', 'Indicators'),
      anchor('chart-indicator-templates', 'Indicator templates'),
      anchor('chart-hexalang', 'HexaLang editor'),
      anchor('chart-alert', 'Alert'),
      anchor('chart-replay', 'Replay'),
      anchor('chart-settings', 'Chart settings'),
      anchor('chart-fullscreen', 'Full screen'),
      anchor('chart-layout-single', 'Layout: 1 chart'),
      anchor('chart-layout-two-columns', 'Layout: 2 side by side'),
      anchor('chart-layout-two-rows', 'Layout: 2 stacked'),
      anchor('chart-layout-four-grid', 'Layout: 4 grid'),
      anchor('chart-layout-more', 'More layouts (up to 8)'),
      anchor('chart-layout-manage', 'Manage / save layout'),
    ],
  },
]
