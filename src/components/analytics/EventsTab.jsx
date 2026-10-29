import React, { useState } from 'react'
import { Alert, Card, Empty, Select, Space, Table, Typography } from 'antd'
import { fetchAnalyticsEvents, fetchAnalyticsTimeseries } from '../../api'
import { LineChart } from './LineChart'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { EVENT_CATALOGUE, delta, num } from './format'

const { Text } = Typography

/** Every event in the range; pick one to see it over time and split by one of its props. */
export function EventsTab({ filters, filterKey }) {
  const [selected, setSelected] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const list = useAnalyticsQuery(() => fetchAnalyticsEvents(filters), filterKey)
  const series = useAnalyticsQuery(
    () => fetchAnalyticsTimeseries({ ...filters, metric: 'events', event: selected, interval: 'day' }),
    `${filterKey}|${selected}`,
    { enabled: Boolean(selected) }
  )
  const split = useAnalyticsQuery(
    () => fetchAnalyticsEvents({ ...filters, name: selected, breakdown: `props.${breakdown}` }),
    `${filterKey}|${selected}|${breakdown}`,
    { enabled: Boolean(selected && breakdown) }
  )

  const props = selected ? EVENT_CATALOGUE[selected] || [] : []

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small" title="Events">
        {list.error ? (
          <Alert type="error" message={list.error} />
        ) : (
          <Table
            size="small"
            rowKey="name"
            loading={list.loading}
            dataSource={list.data?.items || []}
            pagination={{ pageSize: 15, hideOnSinglePage: true }}
            rowClassName={(r) => (r.name === selected ? 'ant-table-row-selected' : '')}
            onRow={(r) => ({
              onClick: () => {
                setSelected(r.name)
                setBreakdown((EVENT_CATALOGUE[r.name] || [])[0] || null)
              },
              style: { cursor: 'pointer' },
            })}
            columns={[
              { title: 'Event', dataIndex: 'name' },
              { title: 'Count', dataIndex: 'events', align: 'right', render: num, sorter: (a, b) => a.events - b.events },
              { title: 'Users', dataIndex: 'unique_users', align: 'right', render: num },
              {
                title: 'vs previous',
                dataIndex: 'change_vs_previous',
                align: 'right',
                render: (v) => {
                  const d = delta(v)
                  return d ? <Text type={d.flat ? 'secondary' : undefined} style={{ color: d.flat ? undefined : d.up ? '#49aa19' : '#dc4446' }}>{d.text}</Text> : '—'
                },
              },
            ]}
          />
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          Click an event to see it over time and split it.
        </Text>
      </Card>

      {selected && (
        <>
          <Card size="small" title={`${selected} per day`} loading={series.loading && !series.data}>
            <LineChart points={series.data?.series?.[0]?.points || []} ariaLabel={`${selected} per day`} />
          </Card>
          <Card
            size="small"
            title={`${selected} by`}
            extra={
              props.length > 0 && (
                <Select
                  size="small"
                  value={breakdown}
                  onChange={setBreakdown}
                  style={{ width: 180 }}
                  options={props.map((p) => ({ value: p, label: p }))}
                />
              )
            }
          >
            {props.length === 0 ? (
              <Empty description="This event has no props to split by" />
            ) : split.error ? (
              <Alert type="error" message={split.error} />
            ) : (
              <Table
                size="small"
                rowKey={(r) => String(r.value)}
                loading={split.loading}
                dataSource={split.data?.items || []}
                pagination={{ pageSize: 15, hideOnSinglePage: true }}
                columns={[
                  { title: breakdown, dataIndex: 'value', render: (v) => (v == null || v === '' ? <Text type="secondary">(none)</Text> : String(v)) },
                  { title: 'Count', dataIndex: 'events', align: 'right', render: num },
                  { title: 'Users', dataIndex: 'unique_users', align: 'right', render: num },
                ]}
              />
            )}
          </Card>
        </>
      )}
    </Space>
  )
}
