import React, { useState } from 'react'
import { Alert, Card, Select, Space, Table, Typography } from 'antd'
import { fetchAnalyticsRetention } from '../../api'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { EVENT_OPTIONS, num, pct } from './format'

const { Text } = Typography

// Sequential, one hue: the cell's share sets the blue's opacity; the number is always in text ink.
const cellStyle = (v) => ({
  background: `rgba(57, 135, 229, ${0.08 + Math.max(0, Math.min(1, v)) * 0.62})`,
  color: '#fff',
  textAlign: 'center',
  padding: '6px 4px',
  borderRadius: 4,
  fontVariantNumeric: 'tabular-nums',
})

/** Cohorts by first visit (or sign-up) week/day, and the share that came back in later periods. */
export function RetentionTab({ filters, filterKey }) {
  const [cohort, setCohort] = useState('first_seen')
  const [period, setPeriod] = useState('week')
  const [returnEvent, setReturnEvent] = useState(null)
  const q = useAnalyticsQuery(
    () => fetchAnalyticsRetention({ ...filters, cohort, interval: period, return_event: returnEvent || undefined }),
    `${filterKey}|${cohort}|${period}|${returnEvent}`
  )

  const cohorts = q.data?.cohorts || []
  const periods = Math.max(0, ...cohorts.map((c) => c.retained?.length || 0))
  const unit = period === 'week' ? 'Week' : 'Day'

  return (
    <Card
      size="small"
      title="Retention"
      extra={
        <Space wrap>
          <Select
            size="small"
            value={cohort}
            onChange={setCohort}
            style={{ width: 150 }}
            options={[
              { value: 'first_seen', label: 'By first visit' },
              { value: 'signup', label: 'By sign-up' },
            ]}
          />
          <Select
            size="small"
            value={period}
            onChange={setPeriod}
            style={{ width: 110 }}
            options={[
              { value: 'week', label: 'Weekly' },
              { value: 'day', label: 'Daily' },
            ]}
          />
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="Came back = any visit"
            value={returnEvent}
            onChange={setReturnEvent}
            style={{ width: 220 }}
            options={EVENT_OPTIONS}
          />
        </Space>
      }
    >
      {q.error ? (
        <Alert type="error" message={q.error} />
      ) : (
        <>
          <Table
            size="small"
            rowKey="cohort"
            loading={q.loading}
            dataSource={cohorts}
            pagination={false}
            scroll={{ x: 200 + periods * 72 }}
            locale={{ emptyText: 'No cohorts in this range' }}
            columns={[
              { title: 'Cohort', dataIndex: 'cohort', fixed: 'left', width: 120 },
              { title: 'People', dataIndex: 'size', align: 'right', width: 80, render: num },
              ...Array.from({ length: periods }, (_, k) => ({
                title: `${unit} ${k}`,
                key: `p${k}`,
                width: 72,
                render: (_, c) => (c.retained?.[k] == null ? null : <div style={cellStyle(c.retained[k])}>{pct(c.retained[k], 0)}</div>),
              })),
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {unit} 0 is always 100%. Each cell: share of the cohort that came back in that {unit.toLowerCase()}.
          </Text>
        </>
      )}
    </Card>
  )
}
