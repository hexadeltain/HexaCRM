import React, { useState } from 'react'
import { Alert, Card, Drawer, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd'
import { fetchAnalyticsArticle, fetchAnalyticsArticles } from '../../api'
import { LineChart } from './LineChart'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { dateTime, duration, num, pct } from './format'

const { Text } = Typography

const SOURCES = ['drawer', 'popup', 'widget', 'link', 'site']

function ArticleDrawer({ articleId, filters, onClose, onOpenUser }) {
  const q = useAnalyticsQuery(() => fetchAnalyticsArticle(articleId, filters), `${articleId}|${JSON.stringify(filters)}`, {
    enabled: articleId != null,
  })
  const d = q.data
  const t = d?.totals || {}

  return (
    <Drawer open={articleId != null} onClose={onClose} width={760} title={d?.article?.title || 'Article'} destroyOnHidden>
      {q.error && <Alert type="error" message={q.error} />}
      {!q.error && !d && <Card loading />}
      {d && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space size="large" wrap>
            <Statistic title="Seen in a feed" value={num(t.impressions)} />
            <Statistic title="Opened" value={num(t.opens)} />
            <Statistic title="Readers" value={num(t.unique_readers)} />
            <Statistic title="Open rate" value={pct(t.open_rate)} />
            <Statistic title="Read depth" value={t.avg_read_pct == null ? '—' : `${Math.round(t.avg_read_pct)}%`} />
            <Statistic title="Time reading" value={t.avg_read_seconds == null ? '—' : duration(t.avg_read_seconds)} />
          </Space>

          <Card size="small" title="Opens per day">
            <LineChart points={(d.series || []).map((p) => ({ t: p.t, v: p.opens }))} ariaLabel="Opens per day" />
          </Card>

          <Card size="small" title="Where opens came from">
            <Table
              size="small"
              rowKey="source"
              pagination={false}
              dataSource={SOURCES.map((s) => ({ source: s, opens: t.opens_by_source?.[s] || 0 }))}
              columns={[
                { title: 'Source', dataIndex: 'source', render: (s) => ({ drawer: "Terminal What's new", popup: 'Popup', widget: 'Widget', link: 'External link', site: 'Landing site' }[s]) },
                { title: 'Opens', dataIndex: 'opens', align: 'right', render: num },
              ]}
            />
          </Card>

          <Card size="small" title="How far people read">
            <Table
              size="small"
              rowKey="bucket"
              pagination={false}
              dataSource={d.read_depth || []}
              columns={[
                { title: 'Read', dataIndex: 'bucket', render: (b) => `${b}%` },
                { title: 'Readers', dataIndex: 'count', align: 'right', render: num },
              ]}
            />
          </Card>

          {(d.widgets || []).length > 0 && (
            <Card size="small" title="Widgets for this update">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={d.widgets}
                columns={[
                  { title: 'Widget', dataIndex: 'name' },
                  { title: 'Type', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
                  { title: 'Status', dataIndex: 'status' },
                  { title: 'Clicks', dataIndex: 'clicks', align: 'right', render: num },
                  { title: 'Opens from it', dataIndex: 'opens', align: 'right', render: num },
                ]}
              />
            </Card>
          )}

          <Card size="small" title={`Readers (${num(d.readers?.total)})`}>
            <Table
              size="small"
              rowKey={(r, i) => `${r.user_id || 'anon'}-${r.opened_at}-${i}`}
              pagination={false}
              dataSource={d.readers?.items || []}
              columns={[
                {
                  title: 'Reader',
                  render: (_, r) =>
                    r.anonymous || !r.user_id ? (
                      <Text type="secondary">Anonymous</Text>
                    ) : (
                      <a onClick={() => onOpenUser(r.user_id)}>User {r.user_id}</a>
                    ),
                },
                { title: 'Opened', dataIndex: 'opened_at', render: dateTime },
                { title: 'From', dataIndex: 'source', render: (s) => s || '—' },
                { title: 'Read', dataIndex: 'read_pct', align: 'right', render: (v) => (v == null ? '—' : `${Math.round(v)}%`) },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              First 20 readers. Viewing readers is recorded in the audit log.
            </Text>
          </Card>
        </Space>
      )}
    </Drawer>
  )
}

/** Reading numbers for every published article; click one for the detail. */
export function ArticlesTab({ filters, filterKey, onOpenUser }) {
  const [section, setSection] = useState('update')
  const [openId, setOpenId] = useState(null)
  const q = useAnalyticsQuery(() => fetchAnalyticsArticles({ ...filters, section, limit: 50 }), `${filterKey}|${section}`)

  return (
    <Card
      size="small"
      title="Articles"
      extra={
        <Segmented
          size="small"
          value={section}
          onChange={setSection}
          options={[
            { value: 'update', label: 'Product updates' },
            { value: 'blog', label: 'Blog' },
          ]}
        />
      }
    >
      {q.error ? (
        <Alert type="error" message={q.error} />
      ) : (
        <Table
          size="small"
          rowKey="id"
          loading={q.loading}
          dataSource={q.data?.items || []}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 900 }}
          onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: 'Article',
              render: (_, a) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{a.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {a.category} · {a.published_at ? dateTime(a.published_at) : a.status}
                  </Text>
                </Space>
              ),
            },
            { title: 'Seen', dataIndex: 'impressions', align: 'right', render: num, sorter: (a, b) => (a.impressions || 0) - (b.impressions || 0) },
            { title: 'Opened', dataIndex: 'opens', align: 'right', render: num, sorter: (a, b) => (a.opens || 0) - (b.opens || 0) },
            { title: 'Readers', dataIndex: 'unique_readers', align: 'right', render: num },
            { title: 'Open rate', dataIndex: 'open_rate', align: 'right', render: (v) => pct(v) },
            { title: 'Read depth', dataIndex: 'avg_read_pct', align: 'right', render: (v) => (v == null ? '—' : `${Math.round(v)}%`) },
          ]}
        />
      )}
      <ArticleDrawer articleId={openId} filters={filters} onClose={() => setOpenId(null)} onOpenUser={onOpenUser} />
    </Card>
  )
}
