import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { createCategory, deleteCategory, reorderCategories, updateCategory } from '../api'
import { useCategories } from '../hooks/useCategories'

const { Title, Text } = Typography

const SECTIONS = [
  { id: 'update', title: 'Product updates', hint: "Shown in the terminal's What's new and on /whats-new. These light the unread dot." },
  { id: 'blog', title: 'Blog', hint: 'Blog posts. They never light the What\'s new dot.' },
]

const COLORS = ['blue', 'geekblue', 'purple', 'magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan']

function CategoryFormModal({ open, category, defaultSection, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(category)

  const submit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        section: values.section,
        color: values.color,
        is_active: values.is_active,
      }
      if (isEdit) {
        await updateCategory(category.slug, payload)
        message.success(`Saved "${payload.name}"`)
      } else {
        await createCategory({ ...payload, ...(values.slug?.trim() ? { slug: values.slug.trim() } : {}) })
        message.success(`Created "${payload.name}"`)
      }
      onSaved()
      onClose()
    } catch (err) {
      message.error(err.status === 409 ? 'That slug is already taken.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit category` : 'New category'}
      okText={isEdit ? 'Save' : 'Create'}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (!visible) return
        form.setFieldsValue(
          category
            ? { ...category, description: category.description || '' }
            : { name: '', slug: '', description: '', section: defaultSection, color: 'blue', is_active: true }
        )
      }}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: 'Give it a name' }]}>
          <Input placeholder="e.g. New Feature" maxLength={60} />
        </Form.Item>
        {!isEdit && (
          <Form.Item
            name="slug"
            label="Slug"
            extra="Used in links (?category=…). Leave empty to make one from the name. It can't be changed later."
            rules={[{ pattern: /^[a-z0-9][a-z0-9-]{0,39}$/, message: 'Lowercase letters, numbers and dashes' }]}
          >
            <Input placeholder="new-feature" />
          </Form.Item>
        )}
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} maxLength={300} placeholder="Optional — shown to editors only" />
        </Form.Item>
        <Space size="large" wrap>
          <Form.Item name="section" label="Section">
            <Select style={{ width: 180 }} options={SECTIONS.map((s) => ({ value: s.id, label: s.title }))} />
          </Form.Item>
          <Form.Item name="color" label="Colour">
            <Select
              style={{ width: 160 }}
              options={COLORS.map((c) => ({ value: c, label: <Tag color={c}>{c}</Tag> }))}
            />
          </Form.Item>
          <Form.Item name="is_active" label="Visible" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  )
}

function DeleteCategoryModal({ category, categories, onClose, onDeleted }) {
  const [moveTo, setMoveTo] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const inUse = category ? Object.values(category.counts || {}).reduce((a, b) => a + b, 0) : 0
  const targets = categories.filter((c) => c.slug !== category?.slug && c.section === category?.section)

  const confirm = async () => {
    setDeleting(true)
    try {
      const res = await deleteCategory(category.slug, inUse > 0 ? moveTo : undefined)
      message.success(res?.moved ? `Deleted — ${res.moved} article(s) moved` : 'Deleted')
      onDeleted()
      onClose()
    } catch (err) {
      message.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={Boolean(category)}
      title={`Delete "${category?.name}"?`}
      okText="Delete"
      okButtonProps={{ danger: true, disabled: inUse > 0 && !moveTo }}
      confirmLoading={deleting}
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(visible) => visible && setMoveTo(null)}
    >
      {inUse > 0 ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            {inUse} article{inUse === 1 ? '' : 's'} use this category. Move them to:
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Pick a category"
            value={moveTo}
            onChange={setMoveTo}
            options={targets.map((c) => ({ value: c.slug, label: c.name }))}
          />
        </Space>
      ) : (
        <Text type="secondary">No articles use it. This can't be undone.</Text>
      )}
    </Modal>
  )
}

/** Categories of both sections: create, edit, reorder, hide, delete (moving their articles). */
export function CategoriesPage() {
  const { categories, loading, reload } = useCategories()
  const [editing, setEditing] = useState(null) // { category | null, section }
  const [deleting, setDeleting] = useState(null)
  const [reordering, setReordering] = useState(false)

  const bySection = useMemo(() => {
    const groups = { update: [], blog: [] }
    categories.forEach((c) => (groups[c.section] || (groups[c.section] = [])).push(c))
    Object.values(groups).forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
    return groups
  }, [categories])

  const move = async (section, index, delta) => {
    const list = [...bySection[section]]
    const target = index + delta
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    setReordering(true)
    try {
      await reorderCategories(section, list.map((c) => c.slug))
      await reload()
    } catch (err) {
      message.error(err.message)
    } finally {
      setReordering(false)
    }
  }

  const toggleActive = async (category, isActive) => {
    try {
      await updateCategory(category.slug, { is_active: isActive })
      await reload()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = (section) => [
    {
      title: 'Order',
      width: 90,
      render: (_, record, index) => (
        <Space size={2}>
          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={index === 0 || reordering} onClick={() => move(section, index, -1)} aria-label="Move up" />
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            disabled={index === bySection[section].length - 1 || reordering}
            onClick={() => move(section, index, 1)}
            aria-label="Move down"
          />
        </Space>
      ),
    },
    {
      title: 'Category',
      render: (_, c) => (
        <Space direction="vertical" size={0}>
          <Tag color={c.color}>{c.name}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {c.slug}
            {c.description ? ` · ${c.description}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Articles',
      width: 260,
      render: (_, c) => {
        const n = c.counts || {}
        return (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {n.published || 0} live · {n.scheduled || 0} scheduled · {n.draft || 0} draft · {n.archived || 0} archived
          </Text>
        )
      },
    },
    {
      title: 'Visible',
      width: 90,
      render: (_, c) => (
        <Tooltip title={c.is_active ? 'Shown in the feed filters and the editor' : 'Hidden — its articles stay live'}>
          <Switch size="small" checked={c.is_active} onChange={(v) => toggleActive(c, v)} />
        </Tooltip>
      ),
    },
    {
      title: '',
      width: 100,
      align: 'right',
      render: (_, c) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing({ category: c, section })} aria-label="Edit" />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleting(c)} aria-label="Delete" />
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Categories
          </Title>
          <Text type="secondary">Group product updates and blog posts. Order here is the order of the filter chips.</Text>
        </div>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {SECTIONS.map((s) => (
          <Card
            key={s.id}
            title={
              <Space direction="vertical" size={0} style={{ padding: '12px 0' }}>
                <span>{s.title}</span>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  {s.hint}
                </Text>
              </Space>
            }
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({ category: null, section: s.id })}>
                Add category
              </Button>
            }
          >
            <Table
              rowKey="slug"
              size="middle"
              loading={loading}
              pagination={false}
              columns={columns(s.id)}
              dataSource={bySection[s.id] || []}
              locale={{ emptyText: `No ${s.title.toLowerCase()} categories yet` }}
            />
          </Card>
        ))}
      </Space>

      <CategoryFormModal
        open={Boolean(editing)}
        category={editing?.category}
        defaultSection={editing?.section || 'update'}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
      <DeleteCategoryModal category={deleting} categories={categories} onClose={() => setDeleting(null)} onDeleted={reload} />
    </div>
  )
}
