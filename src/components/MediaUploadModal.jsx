import React, { useState } from 'react'
import {
  Modal,
  Upload,
  Input,
  Button,
  Space,
  Row,
  Col,
  Card,
  Typography,
  Image,
  message
} from 'antd'
import { InboxOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { uploadMedia } from '../api'
import { normalizeMediaUrl } from '../utils/media'

const { Dragger } = Upload
const { Title, Text } = Typography

export function MediaUploadModal({ isOpen, onClose }) {
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [recentUploads, setRecentUploads] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hexadelta_recent_media') || '[]')
    } catch {
      return []
    }
  })

  if (!isOpen) return null

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const res = await uploadMedia(file, altText)
      const updated = [res, ...recentUploads].slice(0, 20)
      setRecentUploads(updated)
      localStorage.setItem('hexadelta_recent_media', JSON.stringify(updated))
      setAltText('')
      message.success('Photo uploaded to /api/v1/admin/media')
      onSuccess(res)
    } catch (err) {
      message.error(`Upload failed: ${err.message}`)
      onError(err)
    } finally {
      setUploading(false)
    }
  }

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text)
    message.success(`Copied ${label} to clipboard`)
  }

  return (
    <Modal
      title="Media Library &amp; Photo Uploader"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
      width={780}
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Photo Alt / Description (optional)"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Dragger
          customRequest={handleUpload}
          showUploadList={false}
          disabled={uploading}
          accept="image/png,image/jpeg,image/gif,image/webp"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? 'Uploading to server...' : 'Click or drag photo here to upload'}
          </p>
          <p className="ant-upload-hint">
            PNG, JPEG, GIF or WebP up to 8MB
          </p>
        </Dragger>
      </div>

      <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>
        Uploaded Media Assets ({recentUploads.length})
      </Title>

      {recentUploads.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
          No media uploaded in this session yet.
        </Text>
      ) : (
        <Row gutter={[16, 16]} style={{ maxHeight: 340, overflowY: 'auto' }}>
          {recentUploads.map((item) => (
            <Col xs={24} sm={12} md={8} key={item.id}>
              <Card
                size="small"
                cover={
                  <div style={{ height: 110, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      src={normalizeMediaUrl(item.url)}
                      height={110}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                }
              >
                <Text strong ellipsis style={{ display: 'block', fontSize: 12 }}>
                  #{item.id}: {item.alt || item.original_name || 'Image'}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {item.size ? `${(item.size / 1024).toFixed(0)} KB` : ''}
                </Text>

                <Space style={{ marginTop: 8, width: '100%' }} size="small">
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() =>
                      copyText(
                        `![${item.alt || 'image'}](${normalizeMediaUrl(item.url)})`,
                        'Markdown'
                      )
                    }
                  >
                    MD
                  </Button>
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => copyText(normalizeMediaUrl(item.url), 'URL')}
                  >
                    URL
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Modal>
  )
}
