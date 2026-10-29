import React, { useEffect, useState } from 'react'
import { Alert, Card, Col, Row, Statistic, Table, Typography } from 'antd'
import { fetchAnalyticsLive } from '../../api'
import { num, platformLabel } from './format'

const { Text } = Typography
const POLL_MS = 15000

/** Who is active in the last 5 minutes — refreshes every 15 s while this tab is open. */
export function LiveTab() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchAnalyticsLive()
        .then((d) => {
          if (cancelled) return
          setData(d)
          setError(null)
          setUpdatedAt(new Date())
        })
        .catch((err) => !cancelled && setError(err.message))
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  if (error && !data) return <Alert type="error" showIcon message="Couldn't load live data" description={error} />

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card size="small" loading={!data}>
          <Statistic title="Active right now" value={num(data?.active_now)} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last 5 minutes · {num(data?.events_last_minute)} events in the last minute
            {updatedAt ? ` · updated ${updatedAt.toLocaleTimeString('en-IN')}` : ''}
          </Text>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card size="small" title="By platform" loading={!data}>
          <Table
            size="small"
            rowKey="platform"
            pagination={false}
            dataSource={data?.by_platform || []}
            columns={[
              { title: 'Platform', dataIndex: 'platform', render: platformLabel },
              { title: 'Users', dataIndex: 'users', align: 'right', render: num },
            ]}
          />
        </Card>
      </Col>
      <Col span={24}>
        <Card size="small" title="Where they are" loading={!data}>
          <Table
            size="small"
            rowKey="route"
            pagination={false}
            dataSource={data?.by_route || []}
            locale={{ emptyText: 'Nobody is active right now' }}
            columns={[
              { title: 'Route', dataIndex: 'route' },
              { title: 'Users', dataIndex: 'users', align: 'right', render: num },
            ]}
          />
        </Card>
      </Col>
    </Row>
  )
}
