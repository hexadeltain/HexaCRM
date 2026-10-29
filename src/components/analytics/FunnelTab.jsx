import React, { useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Select, Space, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { fetchAnalyticsFunnel } from '../../api'
import { EVENT_OPTIONS, duration, num, pct } from './format'

const { Text } = Typography
const BAR = '#3987e5'

const DEFAULT_STEPS = [
  { name: 'article_open', ref_id: '', route: '' },
  { name: 'page_view', ref_id: '', route: '/hexalang/create-strategy' },
  { name: 'strategy_save', ref_id: '', route: '' },
]

/** Conversion through 2–8 ordered steps within a time window of the first step. */
export function FunnelTab({ filters }) {
  const [steps, setSteps] = useState(DEFAULT_STEPS)
  const [windowHours, setWindowHours] = useState(24)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (i, patch) => setSteps((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const body = {
        ...filters,
        window_hours: windowHours,
        steps: steps.map((s) => ({
          name: s.name,
          ...(s.ref_id.trim() ? { ref_id: s.ref_id.trim() } : {}),
          ...(s.route.trim() ? { route: s.route.trim() } : {}),
        })),
      }
      setResult(await fetchAnalyticsFunnel(body))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small" title="Steps, in order">
        <Space direction="vertical" style={{ width: '100%' }}>
          {steps.map((s, i) => (
            <Space key={i} wrap>
              <Text type="secondary" style={{ width: 20, display: 'inline-block' }}>
                {i + 1}
              </Text>
              <Select showSearch value={s.name} onChange={(name) => update(i, { name })} options={EVENT_OPTIONS} style={{ width: 200 }} />
              <Input placeholder="ref id (article slug, symbol…)" value={s.ref_id} onChange={(e) => update(i, { ref_id: e.target.value })} style={{ width: 230 }} />
              <Input placeholder="route (optional)" value={s.route} onChange={(e) => update(i, { route: e.target.value })} style={{ width: 210 }} />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                disabled={steps.length <= 2}
                onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}
                aria-label="Remove step"
              />
            </Space>
          ))}
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              disabled={steps.length >= 8}
              onClick={() => setSteps((list) => [...list, { name: 'page_view', ref_id: '', route: '' }])}
            >
              Add step
            </Button>
            <Space size={4}>
              <Text type="secondary">within</Text>
              <InputNumber min={1} max={720} value={windowHours} onChange={(v) => setWindowHours(v || 24)} style={{ width: 80 }} />
              <Text type="secondary">hours of step 1</Text>
            </Space>
            <Button type="primary" onClick={run} loading={loading}>
              Run funnel
            </Button>
          </Space>
        </Space>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}
      {result && (
        <Card size="small" title="Conversion">
          <Table
            size="small"
            rowKey={(_, i) => i}
            pagination={false}
            dataSource={(result.steps || []).map((r, i) => ({ ...r, index: i }))}
            columns={[
              { title: 'Step', render: (_, r) => `${r.index + 1}. ${r.name}` },
              { title: 'Users', dataIndex: 'users', align: 'right', width: 100, render: num },
              {
                title: 'Of step 1',
                dataIndex: 'conversion',
                width: 280,
                render: (v) => (
                  <Space style={{ width: '100%' }}>
                    <div style={{ width: 180, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ width: `${Math.max(0, Math.min(1, v || 0)) * 100}%`, height: '100%', borderRadius: 4, background: BAR }} />
                    </div>
                    <Text>{pct(v)}</Text>
                  </Space>
                ),
              },
              {
                title: 'Median time from previous',
                dataIndex: 'median_seconds_from_prev',
                align: 'right',
                render: (v) => (v == null ? '—' : duration(v)),
              },
            ]}
          />
        </Card>
      )}
    </Space>
  )
}
