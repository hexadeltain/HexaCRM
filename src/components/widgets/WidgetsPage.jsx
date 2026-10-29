import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  BarChartOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  deleteWidget,
  fetchArticles,
  fetchWidget,
  fetchWidgetStats,
  fetchWidgets,
  previewWidgets,
  setWidgetStatus,
} from '../../api'
import { LineChart } from '../analytics/LineChart'
import { WidgetFormDrawer } from './WidgetFormDrawer'
import { PLACEMENTS, PLATFORMS, PLANS, SERVING_REASONS, SKIP_REASONS, STATUS_COLORS, WIDGET_TYPES } from './widgetOptions'

const { Title, Text } = Typography

const placementLabel = (p) => PLACEMENTS.find((x) => x.value === p)?.label || p
const typeLabel = (t) => WIDGET_TYPES.find((x) => x.value === t)?.label || t
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)
const num = (v) => Number(v || 0).toLocaleString('en-IN')

function WidgetStatsDrawer({ widgetId, onClose }) {
  const [widget, setWidget] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!widgetId) return
    setWidget(null)
    setStats(null)
    setError(null)
    Promise.all([fetchWidget(widgetId), fetchWidgetStats(widgetId, { interval: 'day' })])
      .then(([w, s]) => {
        setWidget(w)
        setStats(s)
      })
      .catch((err) => setError(err.message))
  }, [widgetId])

  const t = stats?.totals || {}
  const breakdown = (rows, key, label) => (
    <Table
      size="small"
      rowKey={key}
      pagination={false}
      dataSource={rows || []}
      columns={[
        { title: label, dataIndex: key, render: (v) => (key === 'placement' ? placementLabel(v) : v) },
        { title: 'Impressions', dataIndex: 'impressions', align: 'right', render: num },
        { title: 'Clicks', dataIndex: 'clicks', align: 'right', render: num },
      ]}
    />
  )

  return (
    <Drawer open={Boolean(widgetId)} onClose={onClose} width={720} title={widget ? `Stats — ${widget.name}` : 'Stats'} destroyOnHidden>
      {error && <Alert type="error" message={error} />}
      {!error && (!widget || !stats) && <Card loading />}
      {widget && stats && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {!widget.serving?.is_live && (
            <Alert
              type="warning"
              showIcon
              message="Not being shown right now"
              description={SERVING_REASONS[widget.serving?.reason] || widget.serving?.reason || 'Unknown reason'}
            />
          )}
          <Space size="large" wrap>
            <Statistic title="Impressions" value={t.impressions || 0} />
            <Statistic title="People reached" value={t.unique_viewers || 0} />
            <Statistic title="Clicks" value={t.clicks || 0} />
            <Statistic title="Click rate" value={pct(t.ctr)} />
            <Statistic title="Dismissed" value={t.dismisses || 0} />
            {widget.article && <Statistic title="Update opened from it" value={t.article_opens_from_widget || 0} />}
          </Space>
          <Card size="small" title="Impressions per day">
            <LineChart points={(stats.series || []).map((p) => ({ t: p.t, v: p.impressions }))} ariaLabel="Impressions per day" />
          </Card>
          <Card size="small" title="Clicks per day">
            <LineChart points={(stats.series || []).map((p) => ({ t: p.t, v: p.clicks }))} ariaLabel="Clicks per day" />
          </Card>
          {breakdown(stats.by_placement, 'placement', 'Placement')}
          {breakdown(stats.by_platform, 'platform', 'Platform')}
          {breakdown(stats.by_plan, 'plan', 'Plan')}
        </Space>
      )}
    </Drawer>
  )
}

function PreviewModal({ open, onClose }) {
  const [form] = Form.useForm()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    const v = await form.validateFields()
    if (!v.user_id?.trim() && !v.anon_id?.trim()) {
      message.warning('Enter a user id or an anon id')
      return
    }
    setLoading(true)
    try {
      setResult(
        await previewWidgets({
          user_id: v.user_id?.trim(),
          anon_id: v.anon_id?.trim(),
          placement: v.placement,
          platform: v.platform,
          plan: v.plan,
          account_age_days: v.account_age_days,
        })
      )
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onCancel={onClose} title="What would this viewer see?" width={680} footer={null} destroyOnHidden>
      <Text type="secondary">Runs the serving rules as that viewer without changing anything for them.</Text>
      <Form
        form={form}
        layout="inline"
        style={{ marginTop: 16, rowGap: 8 }}
        initialValues={{ placement: 'chart_workspace', platform: 'web' }}
      >
        <Form.Item name="user_id">
          <Input placeholder="User id" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="anon_id">
          <Input placeholder="or anon id" style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="placement" rules={[{ required: true }]}>
          <Select options={PLACEMENTS} style={{ width: 210 }} />
        </Form.Item>
        <Form.Item name="platform" rules={[{ required: true }]}>
          <Select options={PLATFORMS} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="plan">
          <Select allowClear placeholder="Plan" options={PLANS.map((p) => ({ value: p, label: p }))} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="account_age_days">
          <InputNumber min={0} placeholder="Account age (days)" style={{ width: 170 }} />
        </Form.Item>
        <Button type="primary" onClick={run} loading={loading}>
          Check
        </Button>
      </Form>
      {result && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }}>
          <Text strong>Would see ({result.items?.length || 0})</Text>
          {(result.items || []).length === 0 ? (
            <Text type="secondary">Nothing</Text>
          ) : (
            result.items.map((w) => (
              <div key={w.id}>
                <Tag>{typeLabel(w.type)}</Tag> {w.title} <Text type="secondary">· {placementLabel(w.placement)}</Text>
              </div>
            ))
          )}
          {(result.skipped || []).length > 0 && (
            <>
              <Text strong style={{ marginTop: 12 }}>
                Skipped
              </Text>
              {result.skipped.map((s) => (
                <div key={s.id}>
                  #{s.id} — <Text type="secondary">{SKIP_REASONS[s.reason] || s.reason}</Text>
                </div>
              ))}
            </>
          )}
        </Space>
      )}
    </Modal>
  )
}

/** Widgets: list with all-time stats, create / edit, status changes, per-widget stats, preview. */
export function WidgetsPage({ presetArticleId = null, onPresetConsumed }) {
  const [status, setStatus] = useState('all')
  const [liveOnly, setLiveOnly] = useState(false)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState([])
  const [editing, setEditing] = useState(null) // widget | {} for new
  const [statsId, setStatsId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchWidgets({ status, ...(liveOnly ? { live: 'true' } : {}) })
      setRows(data?.items || [])
    } catch (err) {
      message.error(`Couldn't load widgets: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [status, liveOnly])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetchArticles({ limit: 50, status: 'all' })
      .then((data) => setArticles(data?.items || []))
      .catch(() => setArticles([]))
  }, [])

  // Opened from an article ("Add widget"): start a new widget linked to it.
  useEffect(() => {
    if (presetArticleId != null) {
      setEditing({ presetArticleId })
      onPresetConsumed?.()
    }
  }, [presetArticleId, onPresetConsumed])

  const changeStatus = async (w, action) => {
    try {
      await setWidgetStatus(w.id, action)
      message.success({ activate: 'Activated', pause: 'Paused', end: 'Ended' }[action])
      load()
    } catch (err) {
      message.error(err.status === 409 ? "That isn't possible in its current state." : err.message)
    }
  }

  const remove = async (w) => {
    try {
      await deleteWidget(w.id)
      message.success('Deleted')
      load()
    } catch (err) {
      message.error(err.status === 409 ? 'Only drafts can be deleted. End it instead — that keeps its stats.' : err.message)
    }
  }

  const articleTitle = (id) => articles.find((a) => a.id === id)?.title

  const columns = [
    {
      title: 'Widget',
      render: (_, w) => (
        <Space direction="vertical" size={0}>
          <Text strong>{w.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {w.title}
            {w.article_id ? ` · ${articleTitle(w.article_id) || `update #${w.article_id}`}` : ''}
          </Text>
        </Space>
      ),
    },
    { title: 'Type', dataIndex: 'type', width: 100, render: (t) => <Tag>{typeLabel(t)}</Tag> },
    {
      title: 'Where',
      dataIndex: 'placements',
      width: 220,
      render: (list = []) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {list.map(placementLabel).join(', ')}
        </Text>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    { title: 'Impressions', width: 110, align: 'right', render: (_, w) => num(w.stats_summary?.impressions) },
    { title: 'Clicks', width: 80, align: 'right', render: (_, w) => num(w.stats_summary?.clicks) },
    { title: 'Click rate', width: 90, align: 'right', render: (_, w) => pct(w.stats_summary?.ctr) },
    {
      title: '',
      width: 200,
      align: 'right',
      render: (_, w) => (
        <Space size={4}>
          <Tooltip title="Stats">
            <Button size="small" icon={<BarChartOutlined />} onClick={() => setStatsId(w.id)} />
          </Tooltip>
          {w.status !== 'ENDED' && (
            <Tooltip title="Edit">
              <Button size="small" icon={<EditOutlined />} onClick={async () => setEditing(await fetchWidget(w.id))} />
            </Tooltip>
          )}
          {(w.status === 'DRAFT' || w.status === 'PAUSED') && (
            <Tooltip title="Activate">
              <Button size="small" icon={<PlayCircleOutlined />} onClick={() => changeStatus(w, 'activate')} />
            </Tooltip>
          )}
          {w.status === 'ACTIVE' && (
            <Tooltip title="Pause">
              <Button size="small" icon={<PauseCircleOutlined />} onClick={() => changeStatus(w, 'pause')} />
            </Tooltip>
          )}
          {(w.status === 'ACTIVE' || w.status === 'PAUSED') && (
            <Popconfirm title="End this widget for good?" description="It stops showing; its stats stay." onConfirm={() => changeStatus(w, 'end')}>
              <Tooltip title="End">
                <Button size="small" icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          {w.status === 'DRAFT' && (
            <Popconfirm title="Delete this draft?" onConfirm={() => remove(w)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Widgets
          </Title>
          <Text type="secondary">Banners, popups, toasts and cards shown inside the terminal — usually for a product update.</Text>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
            Check a viewer
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>
            New widget
          </Button>
        </Space>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DRAFT', label: 'Drafts' },
              { value: 'PAUSED', label: 'Paused' },
              { value: 'ENDED', label: 'Ended' },
            ]}
          />
          <Space>
            <Switch size="small" checked={liveOnly} onChange={setLiveOnly} />
            <Text type="secondary">Showing right now</Text>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={load} />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description="No widgets yet" /> }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <WidgetFormDrawer
        open={Boolean(editing)}
        widget={editing?.id ? editing : null}
        presetArticleId={editing?.presetArticleId ?? null}
        articles={articles}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
      <WidgetStatsDrawer widgetId={statsId} onClose={() => setStatsId(null)} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  )
}
