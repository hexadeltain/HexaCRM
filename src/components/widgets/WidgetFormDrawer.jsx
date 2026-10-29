import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AutoComplete,
  Button,
  Checkbox,
  Collapse,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd'
import { PictureOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { createArticleWidget, createWidget, updateWidget, uploadMedia } from '../../api'
import { normalizeMediaUrl } from '../../utils/media'
import { ANCHORS, PLACEMENTS, PLATFORMS, PLANS, RETIRE_ON, WIDGET_TYPES } from './widgetOptions'

const { Text } = Typography

const DEFAULTS = {
  type: 'banner',
  placements: ['chart_workspace'],
  platforms: ['web', 'mobile_web', 'android', 'ios'],
  priority: 0,
  audienceAuth: 'any',
  frequency: { max_impressions: 3, min_hours_between: 24, dismissible: true, retire_on: 'dismiss' },
  activate: false,
}

const toForm = (w) => ({
  name: w.name,
  type: w.type,
  article_id: w.article_id ?? null,
  title: w.title,
  body: w.body || '',
  cta_label: w.cta_label || '',
  cta_url: w.cta_url || '',
  placements: w.placements || [],
  anchor: w.anchor || '',
  platforms: w.platforms || DEFAULTS.platforms,
  priority: w.priority ?? 0,
  schedule: [w.starts_at ? dayjs(w.starts_at) : null, w.ends_at ? dayjs(w.ends_at) : null],
  audienceAuth: w.audience?.auth || 'any',
  plans: w.audience?.plans || [],
  exclude_plans: w.audience?.exclude_plans || [],
  ageMin: w.audience?.account_age_days?.min ?? null,
  ageMax: w.audience?.account_age_days?.max ?? null,
  user_ids: w.audience?.user_ids || [],
  has_used_feature: w.audience?.has_used_feature || '',
  not_seen_article: Boolean(w.audience?.not_seen_article),
  frequency: { ...DEFAULTS.frequency, ...(w.frequency || {}) },
})

/** Form values → API body. Empty optional fields are left out (or null on edit, to clear them). */
const toPayload = (v, isEdit) => {
  const clear = isEdit ? null : undefined
  const audience = { auth: v.audienceAuth }
  if (v.plans?.length) audience.plans = v.plans
  if (v.exclude_plans?.length) audience.exclude_plans = v.exclude_plans
  if (v.ageMin != null || v.ageMax != null) {
    audience.account_age_days = {}
    if (v.ageMin != null) audience.account_age_days.min = v.ageMin
    if (v.ageMax != null) audience.account_age_days.max = v.ageMax
  }
  if (v.user_ids?.length) audience.user_ids = v.user_ids.map(String)
  if (v.has_used_feature?.trim()) audience.has_used_feature = v.has_used_feature.trim()
  if (v.not_seen_article) audience.not_seen_article = true

  const [start, end] = v.schedule || []
  const body = {
    name: v.name?.trim() || undefined,
    type: v.type,
    title: v.title?.trim() || undefined,
    body: v.body?.trim() || clear,
    cta_label: v.cta_label?.trim() || clear,
    cta_url: v.cta_url?.trim() || clear,
    placements: v.placements,
    anchor: v.type === 'spotlight' ? v.anchor?.trim() : clear,
    platforms: v.platforms,
    priority: v.priority ?? 0,
    starts_at: start ? start.toISOString() : clear,
    ends_at: end ? end.toISOString() : clear,
    audience,
    frequency: {
      max_impressions: v.frequency?.max_impressions ?? null,
      min_hours_between: v.frequency?.min_hours_between ?? 0,
      dismissible: Boolean(v.frequency?.dismissible),
      retire_on: v.frequency?.retire_on,
    },
  }
  if (v.media_id !== undefined) body.media_id = v.media_id
  if (v.article_id !== undefined) body.article_id = v.article_id
  if (isEdit && v.reset_viewer_state) body.reset_viewer_state = true
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))
}

/**
 * Create or edit a widget. New + linked to an article → the server fills title, body, image and
 * schedule from the article; anything typed here overrides that.
 */
export function WidgetFormDrawer({ open, widget, articles = [], presetArticleId = null, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [media, setMedia] = useState(null) // { id, url } chosen in this session
  const [uploading, setUploading] = useState(false)
  const isEdit = Boolean(widget?.id)
  const type = Form.useWatch('type', form)
  const articleId = Form.useWatch('article_id', form)

  useEffect(() => {
    if (!open) return
    setMedia(widget?.media?.url ? { id: widget.media_id ?? widget.media?.id, url: widget.media.url } : null)
    form.resetFields()
    form.setFieldsValue(
      isEdit
        ? toForm(widget)
        : {
            ...DEFAULTS,
            name: '',
            title: '',
            body: '',
            cta_label: '',
            cta_url: '',
            anchor: '',
            article_id: presetArticleId,
            schedule: [null, null],
            plans: [],
            exclude_plans: [],
            user_ids: [],
            has_used_feature: '',
            not_seen_article: false,
          }
    )
  }, [open, widget, isEdit, presetArticleId, form])

  const linkedArticle = useMemo(() => articles.find((a) => a.id === articleId) || null, [articles, articleId])
  const fromArticle = !isEdit && Boolean(linkedArticle)

  const handleUpload = async (file) => {
    setUploading(true)
    try {
      const res = await uploadMedia(file)
      setMedia({ id: res.id, url: res.url })
      message.success('Image uploaded')
    } catch (err) {
      message.error(err.message)
    } finally {
      setUploading(false)
    }
    return false
  }

  const submit = async (activateOverride) => {
    const values = await form.validateFields()
    const payload = toPayload(
      { ...values, media_id: media ? media.id : isEdit ? null : undefined },
      isEdit
    )
    setSaving(true)
    try {
      let saved
      if (isEdit) {
        saved = (await updateWidget(widget.id, payload)).widget
      } else if (fromArticle) {
        // Server defaults: name, title, body, image, CTA "Read more", starts with the article, 14 days.
        const { article_id, ...rest } = payload
        saved = (await createArticleWidget(article_id, { ...rest, activate: activateOverride })).widget
      } else {
        saved = (await createWidget({ ...payload, activate: activateOverride })).widget
      }
      message.success(isEdit ? 'Widget saved' : activateOverride ? 'Widget created and activated' : 'Widget saved as draft')
      onSaved(saved)
      onClose()
    } catch (err) {
      message.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const requiredUnlessArticle = fromArticle ? [] : [{ required: true, whitespace: true, message: 'Required' }]

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={isEdit ? `Edit widget — ${widget?.name}` : 'New widget'}
      destroyOnHidden
      extra={
        <Space>
          {isEdit ? (
            <Button type="primary" loading={saving} onClick={() => submit()}>
              Save
            </Button>
          ) : (
            <>
              <Button loading={saving} onClick={() => submit(false)}>
                Save draft
              </Button>
              <Button type="primary" loading={saving} onClick={() => submit(true)}>
                Create & activate
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="article_id" label="Product update" extra="Optional. A widget for a scheduled update waits until it goes live.">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Not linked to an update"
            disabled={isEdit && widget?.article_id != null}
            options={articles.map((a) => ({ value: a.id, label: `${a.title}${a.status !== 'PUBLISHED' ? ` (${a.status.toLowerCase()})` : ''}` }))}
          />
        </Form.Item>
        {fromArticle && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Filled from the update"
            description="Leave title, text, image and dates empty to use the update's title, summary, cover and publish date (shown for 14 days). The button opens the article."
          />
        )}

        <Form.Item name="type" label="Type">
          <Radio.Group optionType="button" buttonStyle="solid" options={WIDGET_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </Form.Item>
        <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
          {WIDGET_TYPES.find((t) => t.value === type)?.hint}
        </Text>

        <Form.Item name="name" label="Internal name" rules={requiredUnlessArticle} extra="Only shown here.">
          <Input placeholder={fromArticle ? `${linkedArticle.title} — ${type}` : 'e.g. Drawings sync — launch banner'} maxLength={120} />
        </Form.Item>
        <Form.Item name="title" label="Title" rules={requiredUnlessArticle}>
          <Input placeholder={fromArticle ? linkedArticle.title : 'What users read first'} maxLength={120} />
        </Form.Item>
        <Form.Item name="body" label="Text">
          <Input.TextArea rows={3} maxLength={600} placeholder={fromArticle ? linkedArticle.summary || '' : 'One or two short sentences'} />
        </Form.Item>

        {(type === 'modal' || type === 'card') && (
          <Form.Item label="Image">
            <Space align="start">
              {media?.url && (
                <img src={normalizeMediaUrl(media.url)} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 6 }} />
              )}
              <Space direction="vertical">
                <Upload accept="image/png,image/jpeg,image/gif,image/webp" showUploadList={false} beforeUpload={handleUpload}>
                  <Button icon={<PictureOutlined />} loading={uploading}>
                    {media ? 'Replace' : 'Upload'}
                  </Button>
                </Upload>
                {media && (
                  <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setMedia(null)}>
                    Remove
                  </Button>
                )}
                {!media && fromArticle && <Text type="secondary" style={{ fontSize: 12 }}>Uses the update's cover</Text>}
              </Space>
            </Space>
          </Form.Item>
        )}

        <Space size="middle" style={{ display: 'flex' }} wrap>
          <Form.Item name="cta_label" label="Button text">
            <Input placeholder={fromArticle || articleId ? 'Read more' : 'Try it'} maxLength={40} style={{ width: 180 }} />
          </Form.Item>
          <Form.Item
            name="cta_url"
            label="Button link"
            extra={articleId ? 'Empty = opens the update' : 'https://… or an in-app path like /chart-workspace'}
            rules={[{ pattern: /^(https:\/\/|\/)/, message: 'Must start with https:// or /' }]}
          >
            <Input placeholder="/chart-workspace" style={{ width: 300 }} />
          </Form.Item>
        </Space>

        <Divider titlePlacement="start" plain>
          Where
        </Divider>
        <Form.Item name="placements" label="Placements" rules={[{ required: true, type: 'array', min: 1, message: 'Pick at least one' }]}>
          <Select mode="multiple" options={PLACEMENTS} />
        </Form.Item>
        {type === 'spotlight' && (
          <Form.Item
            name="anchor"
            label="Anchor"
            rules={[{ required: true, whitespace: true, message: 'A spotlight needs an anchor' }]}
            extra="The terminal button it points at (pick one, or type a custom data-widget-anchor). If that button is not on screen, the widget is skipped."
          >
            <AutoComplete
              options={ANCHORS}
              placeholder="chart-replay"
              style={{ width: 300 }}
              filterOption={(input, option) =>
                !option.options && `${option.value} ${option.label}`.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        )}
        <Form.Item name="platforms" label="Platforms" rules={[{ required: true, type: 'array', min: 1, message: 'Pick at least one' }]}>
          <Checkbox.Group options={PLATFORMS} />
        </Form.Item>

        <Divider titlePlacement="start" plain>
          When
        </Divider>
        <Space size="middle" wrap>
          <Form.Item name="schedule" label="Show from – until" extra="Empty start = when activated. Empty end = no end.">
            <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="DD MMM YYYY HH:mm" allowEmpty={[true, true]} />
          </Form.Item>
          <Form.Item name="priority" label="Priority" extra="Higher wins a slot">
            <InputNumber min={0} max={100} style={{ width: 100 }} />
          </Form.Item>
        </Space>

        <Collapse
          ghost
          items={[
            {
              key: 'audience',
              label: 'Who sees it',
              children: (
                <>
                  <Form.Item name="audienceAuth" label="Users">
                    <Radio.Group
                      options={[
                        { value: 'any', label: 'Everyone' },
                        { value: 'logged_in', label: 'Logged in' },
                        { value: 'anonymous', label: 'Not logged in' },
                      ]}
                    />
                  </Form.Item>
                  <Space size="middle" wrap>
                    <Form.Item name="plans" label="Only these plans">
                      <Select mode="multiple" style={{ width: 230 }} placeholder="All plans" options={PLANS.map((p) => ({ value: p, label: p }))} />
                    </Form.Item>
                    <Form.Item name="exclude_plans" label="Except these plans">
                      <Select mode="multiple" style={{ width: 230 }} placeholder="None" options={PLANS.map((p) => ({ value: p, label: p }))} />
                    </Form.Item>
                  </Space>
                  <Space size="middle" wrap>
                    <Form.Item name="ageMin" label="Account at least (days)">
                      <InputNumber min={0} style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item name="ageMax" label="Account at most (days)">
                      <InputNumber min={0} style={{ width: 140 }} />
                    </Form.Item>
                  </Space>
                  <Form.Item name="user_ids" label="Only these user ids" extra="For beta testers. Empty = everyone matching the rest.">
                    <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="101, 202" />
                  </Form.Item>
                  <Form.Item name="has_used_feature" label="Has used feature" extra="A feature name from feature_used events, e.g. replay">
                    <Input style={{ width: 240 }} />
                  </Form.Item>
                  {articleId && (
                    <Form.Item name="not_seen_article" valuePropName="checked">
                      <Checkbox>Skip users who already opened the update</Checkbox>
                    </Form.Item>
                  )}
                </>
              ),
            },
            {
              key: 'frequency',
              label: 'How often',
              children: (
                <>
                  <Space size="middle" wrap>
                    <Form.Item name={['frequency', 'max_impressions']} label="Times per user" extra="Empty = no limit">
                      <InputNumber min={1} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item name={['frequency', 'min_hours_between']} label="Hours between">
                      <InputNumber min={0} style={{ width: 120 }} />
                    </Form.Item>
                  </Space>
                  <Form.Item name={['frequency', 'retire_on']} label="Stop showing it to a user">
                    <Select options={RETIRE_ON} style={{ width: 280 }} />
                  </Form.Item>
                  <Form.Item name={['frequency', 'dismissible']} label="Has a close button" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
        {isEdit && (
          <Form.Item name="reset_viewer_state" valuePropName="checked" style={{ marginTop: 8 }}>
            <Checkbox>Show it again to people who dismissed or already saw it</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Drawer>
  )
}
