import React, { useMemo, useState } from 'react'
import { DatePicker, Select, Space, Tabs, Typography } from 'antd'
import dayjs from 'dayjs'
import { OverviewTab } from './OverviewTab'
import { LiveTab } from './LiveTab'
import { PagesTab } from './PagesTab'
import { EventsTab } from './EventsTab'
import { FunnelTab } from './FunnelTab'
import { RetentionTab } from './RetentionTab'
import { ArticlesTab } from './ArticlesTab'
import { PeopleTab } from './PeopleTab'
import { ExportTab } from './ExportTab'
import { PLATFORM_OPTIONS } from './format'

const { Title, Text } = Typography
const TZ = 'Asia/Kolkata'

const PRESETS = [
  { label: 'Today', value: [dayjs(), dayjs()] },
  { label: 'Last 7 days', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: 'Last 30 days', value: [dayjs().subtract(29, 'day'), dayjs()] },
  { label: 'Last 90 days', value: [dayjs().subtract(89, 'day'), dayjs()] },
]

/** Tracking reports from the terminal, the mobile app and the landing site. Filters apply to every tab. */
export function AnalyticsPage() {
  const [range, setRange] = useState(PRESETS[1].value)
  const [platform, setPlatform] = useState('')
  const [basis, setBasis] = useState('all')
  const [tab, setTab] = useState('overview')
  const [openUserId, setOpenUserId] = useState(null)

  const filters = useMemo(
    () => ({
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
      tz: TZ,
      ...(platform ? { platform } : {}),
      basis,
    }),
    [range, platform, basis]
  )
  const filterKey = JSON.stringify(filters)

  const openUser = (userId) => {
    setOpenUserId(userId)
    setTab('people')
  }

  const tabProps = { filters, filterKey }
  const items = [
    { key: 'overview', label: 'Overview', children: <OverviewTab {...tabProps} /> },
    { key: 'live', label: 'Live', children: <LiveTab /> },
    { key: 'pages', label: 'Pages & paths', children: <PagesTab {...tabProps} /> },
    { key: 'events', label: 'Events', children: <EventsTab {...tabProps} /> },
    { key: 'funnels', label: 'Funnels', children: <FunnelTab filters={filters} /> },
    { key: 'retention', label: 'Retention', children: <RetentionTab {...tabProps} /> },
    { key: 'articles', label: 'Articles', children: <ArticlesTab {...tabProps} onOpenUser={openUser} /> },
    {
      key: 'people',
      label: 'Users & sessions',
      children: <PeopleTab {...tabProps} openUserId={openUserId} onUserOpened={() => setOpenUserId(null)} />,
    },
    { key: 'export', label: 'Export', children: <ExportTab filters={filters} /> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Analytics
          </Title>
          <Text type="secondary">How people use the terminal, the mobile app and the landing site.</Text>
        </div>
        {/* One filter row for every tab (Live ignores the dates). */}
        <Space wrap>
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => v && setRange(v)}
            presets={PRESETS}
            allowClear={false}
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            format="DD MMM YYYY"
          />
          <Select value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} style={{ width: 150 }} />
          <Select
            value={basis}
            onChange={setBasis}
            style={{ width: 170 }}
            options={[
              { value: 'all', label: 'All visitors' },
              { value: 'logged_in', label: 'Logged-in users' },
            ]}
          />
        </Space>
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={items} destroyOnHidden />
    </div>
  )
}
