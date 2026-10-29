import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd'
import {
  eraseUserTracking,
  fetchJob,
  fetchSession,
  fetchSessions,
  fetchUserActivity,
  fetchUserSummary,
  fetchUsersActivity,
} from '../../api'
import { useAnalyticsQuery } from './useAnalyticsQuery'
import { EVENT_OPTIONS, dateTime, duration, num, platformLabel } from './format'

const { Text } = Typography

/** One event as a timeline line: name, what it was about, its props. */
const EventLine = ({ e, prefix }) => (
  <Space direction="vertical" size={0}>
    <Space size={6} wrap>
      {prefix && <Text type="secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{prefix}</Text>}
      <Text strong>{e.name}</Text>
      {e.ref_id && (
        <Tag>
          {e.ref_type}: {e.ref_id}
        </Tag>
      )}
      {e.route && <Text type="secondary">{e.route}</Text>}
    </Space>
    {e.props && Object.keys(e.props).length > 0 && (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {Object.entries(e.props)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' · ')}
      </Text>
    )}
  </Space>
)

function SessionDrawer({ sessionId, onClose }) {
  const q = useAnalyticsQuery(() => fetchSession(sessionId), sessionId, { enabled: Boolean(sessionId) })
  const s = q.data
  return (
    <Drawer open={Boolean(sessionId)} onClose={onClose} width={640} title="Session replay" destroyOnHidden>
      {q.error && <Alert type="error" message={q.error} />}
      {!q.error && !s && <Card loading />}
      {s && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="User">{s.user_id ? `User ${s.user_id}` : 'Anonymous'}</Descriptions.Item>
            <Descriptions.Item label="Started">{dateTime(s.started_at)}</Descriptions.Item>
            <Descriptions.Item label="Length">{duration(s.duration_s)}</Descriptions.Item>
            <Descriptions.Item label="Pages">{num(s.page_views)}</Descriptions.Item>
            <Descriptions.Item label="Platform">{platformLabel(s.platform)}</Descriptions.Item>
            <Descriptions.Item label="Device">{[s.device_type, s.browser, s.os].filter(Boolean).join(' · ') || '—'}</Descriptions.Item>
            <Descriptions.Item label="Came from">{s.referrer_host || 'Direct'}</Descriptions.Item>
            <Descriptions.Item label="Country">{s.country || '—'}</Descriptions.Item>
          </Descriptions>
          <Timeline
            items={(s.events || []).map((e, i) => ({
              key: i,
              children: <EventLine e={e} prefix={`+${duration(e.seconds_since_start)}`} />,
            }))}
          />
        </Space>
      )}
    </Drawer>
  )
}

function UserDrawer({ userId, onClose, onOpenSession }) {
  const [page, setPage] = useState(1)
  const [eventName, setEventName] = useState(null)
  const [job, setJob] = useState(null)
  const summary = useAnalyticsQuery(() => fetchUserSummary(userId), userId, { enabled: Boolean(userId) })
  const activity = useAnalyticsQuery(
    () => fetchUserActivity(userId, { page, limit: 50, name: eventName || undefined }),
    `${userId}|${page}|${eventName}`,
    { enabled: Boolean(userId) }
  )

  useEffect(() => {
    setPage(1)
    setEventName(null)
    setJob(null)
  }, [userId])

  // Poll the erase job until it finishes.
  useEffect(() => {
    if (!job?.id || job.status === 'DONE' || job.status === 'FAILED') return undefined
    const t = setInterval(() => fetchJob(job.id).then(setJob).catch(() => {}), 2000)
    return () => clearInterval(t)
  }, [job])

  const erase = async () => {
    try {
      const { job_id } = await eraseUserTracking(userId)
      setJob({ id: job_id, status: 'QUEUED' })
      message.info('Erasing this user’s tracking data…')
    } catch (err) {
      message.error(err.message)
    }
  }

  const s = summary.data
  return (
    <Drawer
      open={Boolean(userId)}
      onClose={onClose}
      width={760}
      title={`User ${userId || ''}`}
      destroyOnHidden
      extra={
        <Popconfirm
          title="Erase all tracking data of this user?"
          description="Events, sessions and widget history — this can't be undone. Their devices are opted out."
          okText="Erase"
          okButtonProps={{ danger: true }}
          onConfirm={erase}
        >
          <Button danger disabled={Boolean(job && job.status !== 'FAILED')}>
            Erase data
          </Button>
        </Popconfirm>
      }
    >
      {job && (
        <Alert
          style={{ marginBottom: 16 }}
          type={job.status === 'FAILED' ? 'error' : job.status === 'DONE' ? 'success' : 'info'}
          message={job.status === 'DONE' ? 'Tracking data erased' : job.status === 'FAILED' ? `Erase failed: ${job.error || ''}` : 'Erasing…'}
        />
      )}
      {summary.error && <Alert type="error" message={summary.error} />}
      {!summary.error && !s && <Card loading />}
      {s && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space size="large" wrap>
            <Statistic title="Sessions" value={num(s.sessions)} />
            <Statistic title="Time in app" value={duration(s.total_time_s)} />
            <Statistic title="Avg. session" value={duration(s.avg_session_seconds)} />
            <Statistic title="Updates read" value={num(s.articles_read)} />
            <Statistic title="Widgets clicked" value={`${num(s.widgets?.clicked)} / ${num(s.widgets?.seen)}`} />
          </Space>
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Plan">{s.plan || '—'}</Descriptions.Item>
            <Descriptions.Item label="Signed up">{dateTime(s.signed_up_at)}</Descriptions.Item>
            <Descriptions.Item label="First seen">{dateTime(s.first_seen_at)}</Descriptions.Item>
            <Descriptions.Item label="Last seen">{dateTime(s.last_seen_at)}</Descriptions.Item>
            <Descriptions.Item label="Devices" span={2}>
              {(s.devices || []).map((d, i) => (
                <div key={i}>
                  {platformLabel(d.platform)} · {[d.browser, d.os, d.app_version].filter(Boolean).join(' · ')}{' '}
                  <Text type="secondary">({dateTime(d.last_seen_at)})</Text>
                </div>
              ))}
            </Descriptions.Item>
          </Descriptions>
          <Space size="large" align="start" wrap>
            <Card size="small" title="Top pages" style={{ minWidth: 220 }}>
              {(s.top_routes || []).map((r) => (
                <div key={r.route}>
                  {r.route} <Text type="secondary">· {num(r.views)}</Text>
                </div>
              ))}
            </Card>
            <Card size="small" title="Top symbols" style={{ minWidth: 180 }}>
              {(s.top_symbols || []).map((r) => (
                <div key={r.symbol}>
                  {r.symbol} <Text type="secondary">· {num(r.opens)}</Text>
                </div>
              ))}
            </Card>
            <Card size="small" title="Top features" style={{ minWidth: 180 }}>
              {(s.top_features || []).length === 0 ? <Text type="secondary">—</Text> : null}
              {(s.top_features || []).map((r) => (
                <div key={r.feature}>
                  {r.feature} <Text type="secondary">· {num(r.uses)}</Text>
                </div>
              ))}
            </Card>
          </Space>

          <Card
            size="small"
            title="Activity"
            extra={
              <Select
                size="small"
                allowClear
                showSearch
                placeholder="All events"
                value={eventName}
                onChange={(v) => {
                  setEventName(v)
                  setPage(1)
                }}
                style={{ width: 200 }}
                options={EVENT_OPTIONS}
              />
            }
          >
            {activity.error ? (
              <Alert type="error" message={activity.error} />
            ) : (
              <Table
                size="small"
                showHeader={false}
                rowKey={(e, i) => `${e.occurred_at}-${i}`}
                loading={activity.loading}
                dataSource={activity.data?.items || []}
                pagination={{
                  current: page,
                  pageSize: 50,
                  total: activity.data?.total || 0,
                  onChange: setPage,
                  showSizeChanger: false,
                  hideOnSinglePage: true,
                }}
                columns={[
                  { dataIndex: 'occurred_at', width: 170, render: (v) => <Text type="secondary">{dateTime(v)}</Text> },
                  { render: (_, e) => <EventLine e={e} /> },
                  {
                    width: 90,
                    align: 'right',
                    render: (_, e) => (
                      <a onClick={() => onOpenSession(e.session_id)} style={{ fontSize: 12 }}>
                        session
                      </a>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Space>
      )}
    </Drawer>
  )
}

/** Users with tracking data and sessions — both open a step-by-step view. Audit-logged. */
export function PeopleTab({ filters, filterKey, openUserId, onUserOpened }) {
  const [view, setView] = useState('users')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('last_seen')
  const [minDuration, setMinDuration] = useState(null)
  const [userPage, setUserPage] = useState(1)
  const [sessionPage, setSessionPage] = useState(1)
  const [userId, setUserId] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  // Opened from elsewhere (an article's readers).
  useEffect(() => {
    if (openUserId) {
      setUserId(openUserId)
      onUserOpened?.()
    }
  }, [openUserId, onUserOpened])

  const users = useAnalyticsQuery(
    () => fetchUsersActivity({ q: q || undefined, sort, page: userPage, limit: 25, platform: filters.platform }),
    `${q}|${sort}|${userPage}|${filters.platform}`,
    { enabled: view === 'users' }
  )
  const sessions = useAnalyticsQuery(
    () => fetchSessions({ ...filters, min_duration_s: minDuration || undefined, page: sessionPage, limit: 25 }),
    `${filterKey}|${minDuration}|${sessionPage}`,
    { enabled: view === 'sessions' }
  )

  return (
    <Card
      size="small"
      title={
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'users', label: 'Users' },
            { value: 'sessions', label: 'Sessions' },
          ]}
        />
      }
      extra={
        view === 'users' ? (
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="User id"
              onSearch={(v) => {
                setQ(v.trim())
                setUserPage(1)
              }}
              style={{ width: 200 }}
            />
            <Select
              value={sort}
              onChange={setSort}
              style={{ width: 170 }}
              options={[
                { value: 'last_seen', label: 'Recently active' },
                { value: 'sessions', label: 'Most sessions' },
                { value: 'total_time', label: 'Most time in app' },
              ]}
            />
          </Space>
        ) : (
          <Space>
            <Text type="secondary">At least</Text>
            <InputNumber min={0} placeholder="0" value={minDuration} onChange={setMinDuration} style={{ width: 90 }} />
            <Text type="secondary">seconds</Text>
          </Space>
        )
      }
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        Personal activity — opening a user or a session is recorded in the audit log. Emails are not stored here; look up the
        user id in the main admin.
      </Text>
      {view === 'users' ? (
        users.error ? (
          <Alert type="error" message={users.error} />
        ) : (
          <Table
            size="small"
            rowKey="user_id"
            loading={users.loading}
            dataSource={users.data?.items || []}
            onRow={(r) => ({ onClick: () => setUserId(r.user_id), style: { cursor: 'pointer' } })}
            pagination={{ current: userPage, pageSize: 25, total: users.data?.total || 0, onChange: setUserPage, hideOnSinglePage: true, showSizeChanger: false }}
            scroll={{ x: 860 }}
            columns={[
              { title: 'User', dataIndex: 'user_id', render: (v) => `User ${v}` },
              { title: 'Plan', dataIndex: 'plan', render: (v) => v || '—' },
              { title: 'Last seen', dataIndex: 'last_seen_at', render: dateTime },
              { title: 'Sessions', dataIndex: 'sessions', align: 'right', render: num },
              { title: 'Time in app', dataIndex: 'total_time_s', align: 'right', render: duration },
              { title: 'Last on', render: (_, r) => `${platformLabel(r.last_platform)} · ${r.last_route || '—'}` },
            ]}
          />
        )
      ) : sessions.error ? (
        <Alert type="error" message={sessions.error} />
      ) : (
        <Table
          size="small"
          rowKey="session_id"
          loading={sessions.loading}
          dataSource={sessions.data?.items || []}
          onRow={(r) => ({ onClick: () => setSessionId(r.session_id), style: { cursor: 'pointer' } })}
          pagination={{
            current: sessionPage,
            pageSize: 25,
            total: sessions.data?.total || 0,
            onChange: setSessionPage,
            hideOnSinglePage: true,
            showSizeChanger: false,
          }}
          scroll={{ x: 900 }}
          columns={[
            { title: 'Started', dataIndex: 'started_at', render: dateTime },
            { title: 'Who', render: (_, r) => (r.user_id ? `User ${r.user_id}` : <Text type="secondary">Anonymous</Text>) },
            { title: 'Length', dataIndex: 'duration_s', align: 'right', render: duration },
            { title: 'Pages', dataIndex: 'page_views', align: 'right', render: num },
            { title: 'Entry → exit', render: (_, r) => `${r.entry_route || '—'} → ${r.exit_route || '—'}` },
            { title: 'Platform', dataIndex: 'platform', render: platformLabel },
            { title: 'Events', dataIndex: 'event_count', align: 'right', render: num },
          ]}
        />
      )}

      <UserDrawer userId={userId} onClose={() => setUserId(null)} onOpenSession={setSessionId} />
      <SessionDrawer sessionId={sessionId} onClose={() => setSessionId(null)} />
    </Card>
  )
}
