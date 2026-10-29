import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Upload,
  Tabs,
  Modal,
  DatePicker,
  Tag,
  Divider,
  Popconfirm,
  Image,
  message
} from 'antd'
import {
  ArrowLeftOutlined,
  EyeOutlined,
  SendOutlined,
  SaveOutlined,
  ScheduleOutlined,
  InboxOutlined,
  DeleteOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { slugify, renderMarkdown, formatDateTime } from '../utils/markdown'
import { normalizeMediaUrl } from '../utils/media'
import { uploadMedia } from '../api'
import { useCategories } from '../hooks/useCategories'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

const CATEGORY_SECTIONS = [
  { id: 'update', label: 'Product update' },
  { id: 'blog', label: 'Blog' },
]

export function ArticleEditor({
  article,
  isNew,
  saving,
  onSaveDraft,
  onPublishNow,
  onSchedule,
  onArchive,
  onCancel,
  onPreview
}) {
  const [form] = Form.useForm()
  const { categories, loading: categoriesLoading } = useCategories()
  const [title, setTitle] = useState(article?.title || '')
  const [slug, setSlug] = useState(article?.slug || '')
  const [isSlugManual, setIsSlugManual] = useState(Boolean(article?.slug))
  const [body, setBody] = useState(article?.body || '')

  // Cover Image
  const [coverMedia, setCoverMedia] = useState(article?.cover || null)
  const [coverMediaId, setCoverMediaId] = useState(article?.cover?.id || null)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Gallery Images
  const [galleryImages, setGalleryImages] = useState(
    article?.images?.map((img) => ({
      media_id: img.id || img.media_id,
      url: img.url,
      caption: img.caption || ''
    })) || []
  )
  const [uploadingGallery, setUploadingGallery] = useState(false)

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduledDayjs, setScheduledDayjs] = useState(() => {
    if (article?.published_at && new Date(article.published_at) > new Date()) {
      return dayjs(article.published_at)
    }
    return dayjs().add(1, 'day').hour(9).minute(0).second(0)
  })

  // Auto-generate slug
  useEffect(() => {
    if (!isSlugManual && title) {
      setSlug(slugify(title))
    }
  }, [title, isSlugManual])

  // Custom Upload Handler for Cover Photo
  const handleCoverUpload = async ({ file, onSuccess, onError }) => {
    setUploadingCover(true)
    try {
      const res = await uploadMedia(file, title || 'Cover image')
      setCoverMedia(res)
      setCoverMediaId(res.id)
      message.success('Cover photo uploaded')
      onSuccess(res)
    } catch (err) {
      message.error(`Cover upload failed: ${err.message}`)
      onError(err)
    } finally {
      setUploadingCover(false)
    }
  }

  // Custom Upload Handler for Gallery Photos
  const handleGalleryUpload = async ({ file, onSuccess, onError }) => {
    setUploadingGallery(true)
    try {
      const res = await uploadMedia(file, file.name)
      setGalleryImages((prev) => [
        ...prev,
        {
          media_id: res.id,
          url: res.url,
          caption: ''
        }
      ])
      message.success('Photo added to gallery')
      onSuccess(res)
    } catch (err) {
      message.error(`Gallery upload failed: ${err.message}`)
      onError(err)
    } finally {
      setUploadingGallery(false)
    }
  }

  const getPayload = () => {
    const values = form.getFieldsValue()
    return {
      title: (values.title || title).trim(),
      slug: slug.trim() || undefined,
      summary: values.summary?.trim() || null,
      body: body || null,
      category: values.category || 'feature',
      version: values.version?.trim() || null,
      author_name: values.author_name?.trim() || null,
      tags: values.tags?.length ? values.tags : null,
      cover_media_id: coverMediaId || null,
      images: galleryImages.map((img) => ({
        media_id: img.media_id,
        caption: img.caption || null
      }))
    }
  }

  const handleSave = () => {
    form.validateFields().then(() => {
      onSaveDraft(getPayload())
    })
  }

  const handlePublishImmediate = () => {
    form.validateFields().then(() => {
      onPublishNow(getPayload())
    })
  }

  const handleConfirmSchedule = () => {
    if (!scheduledDayjs) {
      message.error('Please select release date and time')
      return
    }
    setIsScheduleModalOpen(false)
    onSchedule(getPayload(), scheduledDayjs.toISOString())
  }

  const handlePreviewCurrent = () => {
    const payload = getPayload()
    onPreview({
      ...payload,
      id: article?.id || 9999,
      status: article?.status || 'DRAFT',
      published_at: article?.published_at || null,
      cover: coverMedia,
      images: galleryImages
    })
  }

  return (
    <div className="article-editor">
      {/* Top Header */}
      <div
        className="article-editor-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <Space className="article-editor-heading" size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
            Back
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {isNew ? 'Create Product Update' : 'Edit Product Update'}
              </Title>
              <Tag color={article?.status === 'PUBLISHED' ? 'success' : 'processing'}>
                {article?.status || 'Draft'}
              </Tag>
            </div>
            {article?.published_at && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(article.published_at) > new Date()
                  ? `Scheduled for: ${formatDateTime(article.published_at)}`
                  : `Published on: ${formatDateTime(article.published_at)}`}
              </Text>
            )}
          </div>
        </Space>

        <Space className="article-editor-actions" wrap>
          <Button aria-label="Preview" title="Preview" icon={<EyeOutlined />} onClick={handlePreviewCurrent}>
            Preview
          </Button>

          <Button aria-label="Save Draft" title="Save Draft" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
            Save Draft
          </Button>

          <Button
            type="primary"
            aria-label="Publish Now"
            title="Publish Now"
            icon={<SendOutlined />}
            onClick={handlePublishImmediate}
            loading={saving}
          >
            Publish Now
          </Button>

          <Button
            aria-label="Schedule"
            title="Schedule"
            icon={<ScheduleOutlined />}
            onClick={() => setIsScheduleModalOpen(true)}
            loading={saving}
          >
            Schedule
          </Button>
        </Space>
      </div>

      {/* Main Form */}
      <Form
        className="article-editor-form"
        form={form}
        layout="vertical"
        initialValues={{
          title: article?.title || '',
          summary: article?.summary || '',
          category: article?.category || 'feature',
          version: article?.version || '',
          author_name: article?.author_name || 'HexaDelta Team',
          tags: article?.tags || []
        }}
      >
        <Row gutter={[24, 24]}>
          {/* Left Column: Title, Summary, Content */}
          <Col xs={24} lg={16}>
            <Card style={{ marginBottom: 24 }}>
              <Form.Item
                name="title"
                label="Article Title"
                rules={[{ required: true, message: 'Please enter article title' }]}
              >
                <Input
                  size="large"
                  placeholder="e.g. Advanced Chart Drawing Tools & Indicators"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </Form.Item>

              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Slug:{' '}
                </Text>
                {isSlugManual ? (
                  <Input
                    size="small"
                    className="article-slug-input"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                  />
                ) : (
                  <Text code style={{ marginLeft: 4 }}>
                    {slug || 'auto-generated-slug'}
                  </Text>
                )}
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsSlugManual(!isSlugManual)}
                >
                  {isSlugManual ? 'Reset Auto' : 'Edit Slug'}
                </Button>
              </div>

              <Form.Item name="summary" label="Short Summary">
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  showCount
                  placeholder="Discover the latest improvements to HexaDelta charts and screeners..."
                />
              </Form.Item>
            </Card>

            <Card
              className="article-content-card"
              title="Article Content"
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Markdown &amp; HTML supported
                </Text>
              }
            >
              <Tabs
                defaultActiveKey="edit"
                items={[
                  {
                    key: 'edit',
                    label: 'Editor',
                    children: (
                      <Input.TextArea
                        autoSize={{ minRows: 18, maxRows: 40 }}
                        placeholder="Explain what changed, why it helps traders, and how to use the new feature...&#10;&#10;### Key Highlights:&#10;- Real-time drawing sync across devices&#10;- Sub-second screener execution engine"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="article-body-input"
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                      />
                    )
                  },
                  {
                    key: 'preview',
                    label: 'Live Preview',
                    children: (
                      <div
                        style={{
                          minHeight: 280,
                          padding: 16,
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 8,
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(body || '*No content written yet.*')
                        }}
                      />
                    )
                  }
                ]}
              />
            </Card>
          </Col>

          {/* Right Column: Category, Metadata, Media, Publishing */}
          <Col xs={24} lg={8}>
            <Card title="Category &amp; Details" style={{ marginBottom: 24 }}>
              <Form.Item
                name="category"
                label="Category"
                required
                extra="Product update categories show in the terminal's What's new; blog ones don't light the unread dot."
              >
                <Select
                  loading={categoriesLoading}
                  placeholder="Pick a category"
                  options={CATEGORY_SECTIONS.map((sec) => ({
                    label: sec.label,
                    options: categories
                      .filter((c) => c.section === sec.id && (c.is_active || c.slug === article?.category))
                      .map((c) => ({ value: c.slug, label: <Tag color={c.color}>{c.name}</Tag> })),
                  })).filter((group) => group.options.length > 0)}
                />
              </Form.Item>

              <Divider style={{ margin: '16px 0' }} />

              <Form.Item name="version" label="Version / Release Tag">
                <Input placeholder="e.g. 2.4.0" />
              </Form.Item>

              <Form.Item name="author_name" label="Author">
                <Input placeholder="HexaDelta Team" />
              </Form.Item>

              <Form.Item name="tags" label="Tags">
                <Select
                  mode="tags"
                  placeholder="Type tag and press enter"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Card>

            {/* Cover Image Card */}
            <Card title="Cover Photo" style={{ marginBottom: 24 }}>
              {coverMedia?.url ? (
                <div>
                  <Image
                    src={normalizeMediaUrl(coverMedia.url)}
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6 }}
                  />
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setCoverMedia(null)
                        setCoverMediaId(null)
                      }}
                    >
                      Remove Cover
                    </Button>
                  </div>
                </div>
              ) : (
                <Dragger
                  customRequest={handleCoverUpload}
                  showUploadList={false}
                  disabled={uploadingCover}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    {uploadingCover ? 'Uploading...' : 'Click or drag cover photo here'}
                  </p>
                  <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                    PNG, JPEG, GIF or WebP (max 8MB)
                  </p>
                </Dragger>
              )}
            </Card>

            {/* Gallery Screenshots */}
            <Card
              title="Gallery Screenshots"
              extra={
                <Upload
                  customRequest={handleGalleryUpload}
                  showUploadList={false}
                  disabled={uploadingGallery}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                >
                  <Button size="small" icon={<InboxOutlined />}>
                    Add Photo
                  </Button>
                </Upload>
              }
              style={{ marginBottom: 24 }}
            >
              {galleryImages.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  No screenshots attached yet.
                </Text>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 8,
                        borderRadius: 6,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <Image
                        src={normalizeMediaUrl(img.url)}
                        width={50}
                        height={40}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Input
                        size="small"
                        placeholder="Add caption..."
                        value={img.caption}
                        onChange={(e) => {
                          const updated = [...galleryImages]
                          updated[idx].caption = e.target.value
                          setGalleryImages(updated)
                        }}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() =>
                          setGalleryImages(galleryImages.filter((_, i) => i !== idx))
                        }
                      />
                    </div>
                  ))}
                </Space>
              )}
            </Card>

            {/* Archive option if published */}
            {!isNew && article?.status === 'PUBLISHED' && (
              <Card style={{ borderColor: 'rgba(255, 77, 79, 0.3)' }}>
                <Title level={5} style={{ color: '#ff4d4f', margin: 0 }}>
                  Archive Update
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  Removes this article from the public What's New feed.
                </Paragraph>
                <Popconfirm
                  title="Archive article?"
                  onConfirm={() => onArchive(article.id)}
                  okText="Archive"
                  cancelText="Cancel"
                >
                  <Button danger block icon={<DeleteOutlined />}>
                    Archive / Unpublish
                  </Button>
                </Popconfirm>
              </Card>
            )}
          </Col>
        </Row>
      </Form>

      {/* Ant Design Modal for Scheduling */}
      <Modal
        title="Schedule Article Release"
        open={isScheduleModalOpen}
        onCancel={() => setIsScheduleModalOpen(false)}
        onOk={handleConfirmSchedule}
        okText="Confirm Schedule"
      >
        <Paragraph type="secondary">
          Choose the release date and time for when this update will automatically go live.
        </Paragraph>
        <DatePicker
          showTime
          style={{ width: '100%', marginTop: 12 }}
          value={scheduledDayjs}
          onChange={(val) => setScheduledDayjs(val)}
        />
      </Modal>
    </div>
  )
}
