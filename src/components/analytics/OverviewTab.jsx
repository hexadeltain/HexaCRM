import React, { useState } from 'react'
import { Alert, Card, Col, Row, Segmented, Space, Statistic, Table, Typography } from 'antd'
import { fetchAnalyticsOverview, fetchAnalyticsTimeseries } from '../../api'
import { LineChart } from './LineChart'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { delta, duration, num, pct, platformLabel } from './format'

const { Text } = Typography

const METRICS = [
  { value: 'active_users', label: 'Active users' },
  { value: 'new_users', label: 'New users' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'avg_session_seconds', label: 'Avg. session' },
]

const Change = ({ value }) => {
  const d = delta(value)
  if (!d) return null
  return (
    <Text style={{ fontSize: 12, color: d.flat ? undefined : d.up ? '#49aa19' : '#dc4446' }} type={d.flat ? 'secondary' : undefined}>
      {d.text} vs previous period
    </Text>
  )
}

const Tile = ({ title, value, change, hint }) => (
  <Card size="small" style={{ height: '100%' }}>
    <Statistic title={title} value={value} />
    {change !== undefined ? <Change value={change} /> : hint ? <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text> : null}
  </Card>
)

/** Headline numbers, one metric over time, and the top routes / features / platforms / countries. */
export function OverviewTab({ filters, filterKey }) {
  const [metric, setMetric] = useState('active_users')
  const overview = useAnalyticsQuery(() => fetchAnalyticsOverview(filters), filterKey)
  const series = useAnalyticsQuery(
    () => fetchAnalyticsTimeseries({ ...filters, metric, interval: 'day' }),
    `${filterKey}|${metric}`
  )

  if (overview.error) return <Alert type="error" showIcon message="Couldn't load the overview" description={overview.error} />
  const o = overview.data || {}
  const a = o.active_users || {}
  const points = series.data?.series?.[0]?.points || []

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6} lg={4}>
          <Tile title="Daily active" value={num(a.dau)} change={o.compare_previous?.dau} />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Tile title="Weekly active" value={num(a.wau)} hint="7 days to the range end" />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Tile title="Monthly active" value={num(a.mau)} hint={`Stickiness ${pct(a.dau_mau)}`} />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Tile title="New users" value={num(o.new_users)} change={o.compare_previous?.new_users} />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Tile title="Sessions" value={num(o.sessions)} change={o.compare_previous?.sessions} />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Tile title="Avg. session" value={duration(o.avg_session_seconds)} hint={`${num(o.page_views)} page views`} />
        </Col>
      </Row>

      <Card
        size="small"
        title={METRICS.find((m) => m.value === metric)?.label}
        extra={<Segmented size="small" value={metric} onChange={setMetric} options={METRICS} />}
        loading={series.loading && !series.data}
      >
        <LineChart
          points={points}
          format={metric === 'avg_session_seconds' ? duration : undefined}
          ariaLabel={`${METRICS.find((m) => m.value === metric)?.label} per day`}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Top pages">
            <Table
              size="small"
              rowKey="route"
              loading={overview.loading}
              pagination={false}
              dataSource={o.top_routes || []}
              columns={[
                { title: 'Route', dataIndex: 'route', ellipsis: true },
                { title: 'Views', dataIndex: 'views', align: 'right', render: num },
                { title: 'Users', dataIndex: 'users', align: 'right', render: num },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Top features">
            <Table
              size="small"
              rowKey="feature"
              loading={overview.loading}
              pagination={false}
              dataSource={o.top_features || []}
              locale={{ emptyText: 'No feature_used events in this range' }}
              columns={[
                { title: 'Feature', dataIndex: 'feature' },
                { title: 'Uses', dataIndex: 'uses', align: 'right', render: num },
                { title: 'Users', dataIndex: 'users', align: 'right', render: num },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Platforms">
            <Table
              size="small"
              rowKey="platform"
              loading={overview.loading}
              pagination={false}
              dataSource={o.platforms || []}
              columns={[
                { title: 'Platform', dataIndex: 'platform', render: platformLabel },
                { title: 'Users', dataIndex: 'users', align: 'right', render: num },
                { title: 'Share', dataIndex: 'share', align: 'right', render: (v) => pct(v) },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Countries">
            <Table
              size="small"
              rowKey="country"
              loading={overview.loading}
              pagination={false}
              dataSource={o.countries || []}
              columns={[
                { title: 'Country', dataIndex: 'country', render: (c) => c || 'Unknown' },
                { title: 'Users', dataIndex: 'users', align: 'right', render: num },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
