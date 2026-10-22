import React from 'react'
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Segmented,
  Card,
  Typography,
  Image,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SendOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PictureOutlined
} from '@ant-design/icons'
import { formatDate, formatDateTime } from '../utils/markdown'

const { Title, Text } = Typography

export function ArticleList({
  articles,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onNewArticle,
  onEditArticle,
  onPreviewArticle,
  onQuickPublish,
  onArchiveArticle,
  onRefresh
}) {
  const getStatusTag = (record) => {
    const isFuture = record.published_at && new Date(record.published_at) > new Date()
    if (record.status === 'PUBLISHED' && isFuture) {
      return (
        <Tag icon={<ClockCircleOutlined />} color="warning">
          Scheduled
        </Tag>
      )
    }

    switch (record.status) {
      case 'PUBLISHED':
        return <Tag color="success">Published</Tag>
      case 'DRAFT':
        return <Tag color="processing">Draft</Tag>
      case 'ARCHIVED':
        return <Tag color="default">Archived</Tag>
      default:
        return <Tag>{record.status}</Tag>
    }
  }

  const getCategoryTag = (category) => {
    switch (category) {
      case 'feature':
        return <Tag color="purple">New Feature</Tag>
      case 'improvement':
        return <Tag color="green">Improvement</Tag>
      case 'bugfix':
        return <Tag color="red">Bug Fix</Tag>
      case 'announcement':
        return <Tag color="geekblue">Announcement</Tag>
      default:
        return <Tag>{category || 'Update'}</Tag>
    }
  }

  const columns = [
    {
      title: 'Cover',
      dataIndex: 'cover',
      key: 'cover',
      width: 80,
      render: (cover) =>
        cover?.url ? (
          <Image
            src={cover.url}
            width={60}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 40,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.3)'
            }}
          >
            <PictureOutlined />
          </div>
        )
    },
    {
      title: 'Title & Summary',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <Typography.Link
            style={{ fontWeight: 600, fontSize: 14 }}
            onClick={() => onEditArticle(record.id)}
          >
            {title}
          </Typography.Link>
          {record.version && (
            <Tag style={{ marginLeft: 8 }} color="default">
              v{record.version}
            </Tag>
          )}
          {record.summary && (
            <div>
              <Text type="secondary" ellipsis style={{ maxWidth: 450, display: 'block', fontSize: 12 }}>
                {record.summary}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category) => getCategoryTag(category)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (_, record) => getStatusTag(record)
    },
    {
      title: 'Date',
      key: 'date',
      width: 160,
      render: (_, record) => {
        const isFuture = record.published_at && new Date(record.published_at) > new Date()
        if (record.status === 'PUBLISHED' && isFuture) {
          return (
            <Tooltip title={formatDateTime(record.published_at)}>
              <Text type="warning" style={{ fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatDate(record.published_at)}
              </Text>
            </Tooltip>
          )
        }
        if (record.status === 'PUBLISHED') {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(record.published_at)}
            </Text>
          )
        }
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(record.updated_at || record.created_at)}
          </Text>
        )
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Preview">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onPreviewArticle(record.id)}
            />
          </Tooltip>

          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditArticle(record.id)}
            />
          </Tooltip>

          {record.status === 'DRAFT' && (
            <Tooltip title="Publish immediately">
              <Button
                type="text"
                size="small"
                style={{ color: '#52c41a' }}
                icon={<SendOutlined />}
                onClick={() => onQuickPublish(record.id)}
              />
            </Tooltip>
          )}

          {record.status === 'PUBLISHED' && (
            <Popconfirm
              title="Archive article?"
              description="This will remove the update from the live public feed."
              onConfirm={() => onArchiveArticle(record.id)}
              okText="Archive"
              cancelText="Cancel"
            >
              <Tooltip title="Archive">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <Card>
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
            Product Updates
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Manage What's New feed, release notes, and product announcements
          </Text>
        </div>

        <Button type="primary" icon={<PlusOutlined />} onClick={onNewArticle}>
          New Article
        </Button>
      </div>

      {/* Filter and Search Bar */}
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
        <Space wrap>
          <Input.Search
            placeholder="Search articles..."
            allowClear
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: 240 }}
          />

          <Segmented
            options={[
              { label: 'All', value: 'all' },
              { label: 'Published', value: 'PUBLISHED' },
              { label: 'Scheduled', value: 'SCHEDULED' },
              { label: 'Drafts', value: 'DRAFT' },
              { label: 'Archived', value: 'ARCHIVED' }
            ]}
            value={statusFilter}
            onChange={onStatusFilterChange}
          />

          <Select
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            style={{ width: 150 }}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'feature', label: 'New Feature' },
              { value: 'improvement', label: 'Improvement' },
              { value: 'bugfix', label: 'Bug Fix' },
              { value: 'announcement', label: 'Announcement' }
            ]}
          />
        </Space>

        <Button icon={<ReloadOutlined />} onClick={onRefresh} />
      </div>

      {/* Ant Design Standard Table */}
      <Table
        dataSource={articles}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50']
        }}
      />
    </Card>
  )
}
