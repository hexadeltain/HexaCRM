import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Typography,
  Popconfirm,
  Tooltip,
  message,
  Avatar
} from 'antd'
import {
  SendOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ShareAltOutlined,
  LineChartOutlined
} from '@ant-design/icons'
import {
  fetchScreenerAssignments,
  sendScreenerToMobiles,
  withdrawScreenerAssignment,
  fetchAdminStrategies
} from '../api'
import { formatDateTime } from '../utils/markdown'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/**
 * Normalizes an Indian mobile number: +91 98765-43210, 098765 43210 -> 9876543210
 */
function normalizeIndianMobile(raw = '') {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1))) {
    return digits.slice(1)
  }
  return digits
}

export function ScreenersPage() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, rejected: 0 })
  const [total, setTotal] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Send Screener Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [strategies, setStrategies] = useState([])
  const [loadingStrategies, setLoadingStrategies] = useState(false)
  const [sendForm] = Form.useForm()

  // Load Assignments
  const loadAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: pageSize
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter
      }
      if (searchQuery.trim()) {
        const cleanNumber = normalizeIndianMobile(searchQuery.trim())
        if (/^\d{10}$/.test(cleanNumber)) {
          params.mobile_no = cleanNumber
        } else if (/^\d+$/.test(searchQuery.trim())) {
          params.strategy_id = searchQuery.trim()
        }
      }

      const res = await fetchScreenerAssignments(params)
      if (res) {
        setAssignments(res.assignments || [])
        setTotal(res.total || 0)
        if (res.counts) {
          setCounts({
            pending: res.counts.pending || 0,
            accepted: res.counts.accepted || 0,
            rejected: res.counts.rejected || 0
          })
        }
      }
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Failed to load screener assignments')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, searchQuery])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  // Load available strategies for the Send modal
  const loadStrategies = async () => {
    setLoadingStrategies(true)
    try {
      const res = await fetchAdminStrategies({ useScreener: '1' })
      if (Array.isArray(res)) {
        setStrategies(res)
      } else if (res?.strategies && Array.isArray(res.strategies)) {
        setStrategies(res.strategies)
      }
    } catch (err) {
      console.warn('Could not fetch strategies list for selector:', err)
    } finally {
      setLoadingStrategies(false)
    }
  }

  const handleOpenSendModal = () => {
    sendForm.resetFields()
    setIsSendModalOpen(true)
    loadStrategies()
  }

  const handleSendSubmit = async () => {
    try {
      const values = await sendForm.validateFields()
      setSending(true)

      // Parse mobile numbers from textarea (comma, space, or newline separated)
      const rawText = values.mobile_numbers_text || ''
      const rawTokens = rawText.split(/[\n,;\s]+/).map((t) => t.trim()).filter(Boolean)
      const mobileNumbers = [...new Set(rawTokens.map(normalizeIndianMobile))]

      if (mobileNumbers.length === 0) {
        message.error('Please enter at least one valid mobile number')
        setSending(false)
        return
      }

      const payload = {
        strategy_id: String(values.strategy_id).trim(),
        mobile_numbers: mobileNumbers,
        message: values.message ? String(values.message).trim() : undefined
      }

      const result = await sendScreenerToMobiles(payload)
      if (result) {
        let successMsg = `Screener sent to ${result.sent_to?.length || 0} number(s).`
        if (result.already_accepted?.length) {
          successMsg += ` (${result.already_accepted.length} already accepted)`
        }
        if (result.not_found_numbers?.length) {
          message.warning(`Invalid mobile numbers skipped: ${result.not_found_numbers.join(', ')}`)
        }
        message.success(successMsg)
        setIsSendModalOpen(false)
        loadAssignments()
      }
    } catch (err) {
      if (err.errorFields) return
      console.error(err)
      message.error(err.message || 'Failed to send screener')
    } finally {
      setSending(false)
    }
  }

  const handleWithdraw = async (requestId) => {
    try {
      await withdrawScreenerAssignment(requestId)
      message.success('Screener assignment withdrawn successfully')
      loadAssignments()
    } catch (err) {
      console.error(err)
      message.error(err.message || 'Failed to withdraw screener')
    }
  }

  // Filter client-side by search query if text matches strategy name or symbol
  const filteredAssignments = assignments.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const matchName = item.name?.toLowerCase().includes(q)
    const matchSymbol = item.symbol?.toLowerCase().includes(q)
    const matchMobile = item.mobile_no?.includes(q)
    const matchId = String(item.strategy_id || '').includes(q)
    return matchName || matchSymbol || matchMobile || matchId
  })

  const columns = [
    {
      title: 'Screener / Strategy',
      key: 'screener',
      render: (_, record) => (
        <Space orientation="horizontal" size="small">
          {record.icon_url ? (
            <Avatar src={record.icon_url} size={28} shape="square" />
          ) : (
            <Avatar icon={<LineChartOutlined />} size={28} style={{ background: '#1677ff' }} />
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{record.name || `Strategy #${record.strategy_id}`}</div>
            <Space size={4}>
              {record.symbol && <Tag color="blue">{record.symbol}</Tag>}
              {record.tf && <Tag>{record.tf}m</Tag>}
              <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.strategy_id}</Text>
            </Space>
          </div>
        </Space>
      )
    },
    {
      title: 'Recipient Mobile',
      dataIndex: 'mobile_no',
      key: 'mobile_no',
      render: (mobile) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {mobile ? `+91 ${mobile}` : '—'}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'ACCEPTED') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Accepted
            </Tag>
          )
        }
        if (status === 'REJECTED') {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error">
              Rejected
            </Tag>
          )
        }
        return (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            Pending
          </Tag>
        )
      }
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg) => (msg ? <Text type="secondary">{msg}</Text> : <Text type="secondary">—</Text>)
    },
    {
      title: 'Sent At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(date)}
        </Text>
      )
    },
    {
      title: 'Decided At',
      dataIndex: 'decided_at',
      key: 'decided_at',
      render: (date) =>
        date ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(date)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        )
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Popconfirm
          title="Withdraw screener access?"
          description="This will remove the screener from the user's terminal drawer and screeners list."
          onConfirm={() => handleWithdraw(record.request_id || record.id)}
          okText="Withdraw"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="Withdraw screener">
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>
              Withdraw
            </Button>
          </Tooltip>
        </Popconfirm>
      )
    }
  ]

  return (
    <div className="screeners-page" style={{ padding: '0 0 24px 0' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Screener Sharing
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Share custom screener strategies directly to users' HexaTerminal mobile drawers
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadAssignments} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleOpenSendModal}
          >
            Send Screener
          </Button>
        </Space>
      </div>

      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Sent"
              value={total || assignments.length}
              valueStyle={{ fontSize: 24, fontWeight: 700 }}
              prefix={<ShareAltOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Accepted"
              value={counts.accepted}
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Pending in Drawer"
              value={counts.pending}
              valueStyle={{ color: '#faad14', fontSize: 24, fontWeight: 700 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Rejected"
              value={counts.rejected}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card>
        {/* Search & Filter Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <Space wrap size="middle">
            <Input
              placeholder="Search by Mobile No or Screener Name / ID..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val)
                setPage(1)
              }}
              style={{ width: 140 }}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Accepted', value: 'ACCEPTED' },
                { label: 'Rejected', value: 'REJECTED' }
              ]}
            />
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Showing {filteredAssignments.length} assignment(s)
          </Text>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAssignments}
          rowKey={(record) => record.request_id || record.id || `${record.strategy_id}-${record.mobile_no}`}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            }
          }}
        />
      </Card>

      {/* Send Screener Dialog Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SendOutlined style={{ color: '#1677ff' }} />
            <span>Send Screener to Users</span>
          </div>
        }
        open={isSendModalOpen}
        onCancel={() => setIsSendModalOpen(false)}
        onOk={handleSendSubmit}
        okText="Send Screener"
        confirmLoading={sending}
        destroyOnClose
        width={560}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Send a screener strategy directly to users by mobile number. The screener will appear in their HexaTerminal side drawer for them to accept.
        </Paragraph>

        <Form form={sendForm} layout="vertical">
          <Form.Item
            label="Screener / Strategy"
            name="strategy_id"
            rules={[{ required: true, message: 'Please select or enter a strategy ID' }]}
          >
            {strategies.length > 0 ? (
              <Select
                showSearch
                placeholder="Select a screener or search by name"
                loading={loadingStrategies}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={strategies.map((s) => ({
                  value: String(s.id || s.strategy_id),
                  label: `${s.name || 'Unnamed Screener'} (${s.symbol || ''} ${s.tf ? s.tf + 'm' : ''}) — ID: ${s.id || s.strategy_id}`
                }))}
              />
            ) : (
              <Input placeholder="Enter Strategy ID (e.g. 8412)" />
            )}
          </Form.Item>

          <Form.Item
            label="Recipient Mobile Number(s)"
            name="mobile_numbers_text"
            rules={[{ required: true, message: 'Please enter at least one mobile number' }]}
            extra="Enter one or more 10-digit Indian mobile numbers (+91 supported). Separate by comma, space, or new lines."
          >
            <TextArea
              rows={4}
              placeholder="9876543210&#10;+91 9811223344&#10;9988776655"
            />
          </Form.Item>

          <Form.Item
            label="Optional Note / Message"
            name="message"
            extra="Max 255 characters. Displayed to the user alongside the screener request."
          >
            <Input maxLength={255} placeholder="e.g. Recommended Breakout Screener for Nifty 50" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
