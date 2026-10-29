import React, { useMemo, useState } from 'react'
import { Alert, Card, Input, InputNumber, Space, Table, Typography } from 'antd'
import { fetchAnalyticsFlows, fetchAnalyticsRoutes } from '../../api'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { duration, num, pct } from './format'

const { Text } = Typography

/** Per-route numbers, then how sessions move between pages step by step. */
export function PagesTab({ filters, filterKey }) {
  const [startRoute, setStartRoute] = useState('')
  const [steps, setSteps] = useState(4)
  const routes = useAnalyticsQuery(() => fetchAnalyticsRoutes(filters), filterKey)
  const flows = useAnalyticsQuery(
    () => fetchAnalyticsFlows({ ...filters, start_route: startRoute || undefined, steps, min_count: 1 }),
    `${filterKey}|${startRoute}|${steps}`
  )

  // Links grouped by step, biggest first, with the drop-off after each step.
  const flowRows = useMemo(() => {
    const links = flows.data?.links || []
    const drops = flows.data?.dropoffs || []
    return links
      .map((l, i) => ({ key: i, ...l }))
      .concat(drops.map((d, i) => ({ key: `d${i}`, step: d.step, from: d.route, to: null, count: d.count })))
      // By step; within a step the moves first (biggest first), then where sessions ended.
      .sort((a, b) => a.step - b.step || (a.to === null) - (b.to === null) || b.count - a.count)
  }, [flows.data])

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small" title="Pages">
        {routes.error ? (
          <Alert type="error" message={routes.error} />
        ) : (
          <Table
            size="small"
            rowKey="route"
            loading={routes.loading}
            dataSource={routes.data?.items || []}
            pagination={{ pageSize: 15, hideOnSinglePage: true }}
            scroll={{ x: 760 }}
            columns={[
              { title: 'Route', dataIndex: 'route', ellipsis: true },
              { title: 'Views', dataIndex: 'views', align: 'right', render: num, sorter: (a, b) => a.views - b.views },
              { title: 'Users', dataIndex: 'unique_users', align: 'right', render: num, sorter: (a, b) => a.unique_users - b.unique_users },
              { title: 'Time on page', dataIndex: 'avg_seconds_visible', align: 'right', render: (v) => (v == null ? '—' : duration(v)) },
              { title: 'Entries', dataIndex: 'entries', align: 'right', render: num },
              { title: 'Exits', dataIndex: 'exits', align: 'right', render: num },
              { title: 'Exit rate', dataIndex: 'exit_rate', align: 'right', render: (v) => pct(v) },
            ]}
          />
        )}
      </Card>

      <Card
        size="small"
        title="How people move between pages"
        extra={
          <Space wrap>
            <Input
              allowClear
              placeholder="Start at route (e.g. /chart-workspace)"
              style={{ width: 280 }}
              onPressEnter={(e) => setStartRoute(e.target.value.trim())}
              onChange={(e) => !e.target.value && setStartRoute('')}
            />
            <Space size={4}>
              <Text type="secondary">Steps</Text>
              <InputNumber min={2} max={6} value={steps} onChange={(v) => setSteps(v || 4)} style={{ width: 64 }} />
            </Space>
          </Space>
        }
      >
        {flows.error ? (
          <Alert type="error" message={flows.error} />
        ) : (
          <Table
            size="small"
            rowKey="key"
            loading={flows.loading}
            dataSource={flowRows}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            locale={{ emptyText: 'No page moves in this range' }}
            columns={[
              { title: 'Step', dataIndex: 'step', width: 70 },
              { title: 'From', dataIndex: 'from', ellipsis: true },
              {
                title: 'To',
                dataIndex: 'to',
                ellipsis: true,
                render: (to) => (to === null ? <Text type="secondary">left the app</Text> : to),
              },
              { title: 'Sessions', dataIndex: 'count', align: 'right', render: num },
            ]}
          />
        )}
      </Card>
    </Space>
  )
}
