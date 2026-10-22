import React from 'react'
import { Modal, Typography, Tag, Space, Image, Divider } from 'antd'
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import { renderMarkdown, formatDate, formatDateTime } from '../utils/markdown'

const { Title, Text, Paragraph } = Typography

export function ArticlePreviewModal({ article, onClose }) {
  if (!article) return null

  const isFuture = article.published_at && new Date(article.published_at) > new Date()

  return (
    <Modal
      title={
        <Space>
          <span>What's New in HexaDelta</span>
          <Tag color="blue">Preview</Tag>
        </Space>
      }
      open={Boolean(article)}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      {article.cover?.url && (
        <div style={{ marginBottom: 16 }}>
          <Image
            src={article.cover.url}
            alt={article.title}
            style={{
              width: '100%',
              maxHeight: 260,
              objectFit: 'cover',
              borderRadius: 8
            }}
          />
        </div>
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color="purple">{article.category || 'Feature'}</Tag>
        {article.version && <Tag>v{article.version}</Tag>}
        <Text type="secondary" style={{ fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {isFuture
            ? `Scheduled: ${formatDateTime(article.published_at)}`
            : article.published_at
            ? formatDate(article.published_at)
            : 'Draft (Unpublished)'}
        </Text>
        {article.author_name && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            <UserOutlined style={{ marginRight: 4 }} />
            {article.author_name}
          </Text>
        )}
      </Space>

      <Title level={3} style={{ margin: '8px 0 12px 0' }}>
        {article.title}
      </Title>

      {article.summary && (
        <Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.6 }}>
          {article.summary}
        </Paragraph>
      )}

      <Divider style={{ margin: '16px 0' }} />

      <div
        style={{ fontSize: 14, lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(article.body || '*No content provided.*')
        }}
      />

      {article.images && article.images.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Title level={5}>Attached Media</Title>
          <Image.PreviewGroup>
            <Space wrap size="middle">
              {article.images.map((img, i) => (
                <div key={i}>
                  <Image
                    src={img.url}
                    width={180}
                    height={110}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                  {img.caption && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                      {img.caption}
                    </Text>
                  )}
                </div>
              ))}
            </Space>
          </Image.PreviewGroup>
        </div>
      )}
    </Modal>
  )
}
