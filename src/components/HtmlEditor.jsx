import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Space,
  Button,
  Tooltip,
  Select,
  Input,
  Modal,
  Checkbox,
  Tabs,
  Typography,
  Tag,
  Divider,
  Segmented,
  message
} from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  LinkOutlined,
  DisconnectOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  PictureOutlined,
  TableOutlined,
  CodeOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
  EyeOutlined,
  EditOutlined,
  MinusOutlined
} from '@ant-design/icons'
import { renderMarkdown, isHtml, cleanHtmlOutput } from '../utils/markdown'
import { normalizeMediaUrl } from '../utils/media'

const { Text } = Typography

export function HtmlEditor({
  value = '',
  onChange,
  coverMedia = null,
  galleryImages = [],
  placeholder = 'Write your blog post or article content here...'
}) {
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'code' | 'preview'
  const editorRef = useRef(null)
  const lastHtmlRef = useRef('')
  const savedRangeRef = useRef(null)
  const [previewTheme, setPreviewTheme] = useState('blog') // 'blog' (light) | 'dark'

  const handleDirectClean = () => {
    const cleaned = cleanHtmlOutput(value)
    onChange?.(cleaned)
    if (editorRef.current) {
      editorRef.current.innerHTML = cleaned
      lastHtmlRef.current = cleaned
    }
    message.success('Cleaned to direct semantic HTML format!')
  }

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkNewTab, setLinkNewTab] = useState(true)

  // Image Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  // Convert initial markdown to HTML if legacy markdown was passed
  const getInitialHtml = useCallback((raw) => {
    if (!raw) return ''
    if (isHtml(raw)) return raw
    return renderMarkdown(raw)
  }, [])

  // Sync external value with contentEditable without resetting cursor during active typing
  useEffect(() => {
    const formattedHtml = getInitialHtml(value)
    if (editorRef.current && formattedHtml !== lastHtmlRef.current) {
      editorRef.current.innerHTML = formattedHtml
      lastHtmlRef.current = formattedHtml
    }
  }, [value, getInitialHtml])

  // Update parent when user types in contentEditable
  const handleEditorInput = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    lastHtmlRef.current = html
    onChange?.(html)
  }

  // Save current selection before opening dialogs
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      return sel.toString().trim()
    }
    savedRangeRef.current = null
    return ''
  }

  // Restore saved selection
  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
    } else if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  // Execute standard formatting commands
  const executeCmd = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
    document.execCommand(command, false, val)
    handleEditorInput()
  }

  // Heading / Block Format
  const handleBlockChange = (tag) => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
    if (tag === 'p') {
      document.execCommand('formatBlock', false, '<p>')
    } else if (['h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(tag)) {
      document.execCommand('formatBlock', false, `<${tag}>`)
    }
    handleEditorInput()
  }

  // Open Link Modal
  const openLinkModal = () => {
    const selectedText = saveSelection()
    let existingUrl = ''
    let openInNew = true

    // Check if selection is already inside an anchor
    const sel = window.getSelection()
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'A') {
          existingUrl = node.getAttribute('href') || ''
          openInNew = node.getAttribute('target') === '_blank'
          break
        }
        node = node.parentNode
      }
    }

    setLinkText(selectedText)
    setLinkUrl(existingUrl)
    setLinkNewTab(openInNew)
    setIsLinkModalOpen(true)
  }

  // Insert or Update Link
  const handleConfirmLink = () => {
    if (!linkUrl.trim()) {
      message.warning('Please enter a link URL')
      return
    }

    restoreSelection()

    let url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      url = `https://${url}`
    }

    const text = linkText.trim() || url
    const target = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : ''
    const linkHtml = `<a href="${url}"${target}>${text}</a>`

    document.execCommand('insertHTML', false, linkHtml)
    handleEditorInput()
    setIsLinkModalOpen(false)
  }

  // Unlink
  const handleUnlink = () => {
    executeCmd('unlink')
  }

  // Open Image Modal
  const openImageModal = () => {
    saveSelection()
    setImageUrl('')
    setImageAlt('')
    setIsImageModalOpen(true)
  }

  // Insert Image into Editor
  const handleConfirmImage = () => {
    if (!imageUrl.trim()) {
      message.warning('Please enter an image URL')
      return
    }

    restoreSelection()
    const src = normalizeMediaUrl(imageUrl.trim())
    const alt = imageAlt.trim()
    const imgHtml = `<p><img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 14px 0;" /></p>`

    document.execCommand('insertHTML', false, imgHtml)
    handleEditorInput()
    setIsImageModalOpen(false)
  }

  // Insert Table
  const handleInsertTable = () => {
    const tableHtml = `
<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <thead>
    <tr>
      <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 12px; background: rgba(255, 255, 255, 0.08); text-align: left;">Header 1</th>
      <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 12px; background: rgba(255, 255, 255, 0.08); text-align: left;">Header 2</th>
      <th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 12px; background: rgba(255, 255, 255, 0.08); text-align: left;">Header 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Row 1 Item</td>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Description</td>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Value</td>
    </tr>
    <tr>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Row 2 Item</td>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Description</td>
      <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px;">Value</td>
    </tr>
  </tbody>
</table><p><br/></p>`
    executeCmd('insertHTML', tableHtml)
  }

  // Insert Horizontal Rule
  const handleInsertHr = () => {
    executeCmd('insertHorizontalRule')
  }

  // Keyboard Shortcuts in Visual Editor (Ctrl+K for Link, etc.)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openLinkModal()
    }
  }

  // Calculate words and characters
  const plainText = (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = plainText ? plainText.split(/\s+/).length : 0
  const charCount = plainText.length

  return (
    <div className="html-editor-wrapper">
      <Tabs
        activeKey={activeTab}
        onChange={(tab) => {
          setActiveTab(tab)
          // If switching to visual tab, ensure editorRef reflects current value
          if (tab === 'visual' && editorRef.current) {
            const html = getInitialHtml(value)
            editorRef.current.innerHTML = html
            lastHtmlRef.current = html
          }
        }}
        items={[
          {
            key: 'visual',
            label: (
              <span>
                <EditOutlined style={{ marginRight: 6 }} />
                Visual Editor
              </span>
            ),
            children: (
              <div className="html-editor-container">
                {/* Rich Formatting Toolbar */}
                <div className="html-editor-toolbar">
                  {/* Heading Select */}
                  <Select
                    size="small"
                    defaultValue="p"
                    style={{ width: 120 }}
                    onChange={handleBlockChange}
                    options={[
                      { value: 'p', label: 'Paragraph' },
                      { value: 'h1', label: 'Heading 1' },
                      { value: 'h2', label: 'Heading 2' },
                      { value: 'h3', label: 'Heading 3' },
                      { value: 'h4', label: 'Heading 4' },
                      { value: 'blockquote', label: 'Quote' },
                      { value: 'pre', label: 'Code Block' }
                    ]}
                  />

                  <Divider type="vertical" style={{ margin: '0 4px', height: 18 }} />

                  {/* Inline Text Styles */}
                  <Space size={2} wrap>
                    <Tooltip title="Bold (Ctrl+B)">
                      <Button
                        size="small"
                        type="text"
                        icon={<BoldOutlined />}
                        onClick={() => executeCmd('bold')}
                      />
                    </Tooltip>
                    <Tooltip title="Italic (Ctrl+I)">
                      <Button
                        size="small"
                        type="text"
                        icon={<ItalicOutlined />}
                        onClick={() => executeCmd('italic')}
                      />
                    </Tooltip>
                    <Tooltip title="Underline (Ctrl+U)">
                      <Button
                        size="small"
                        type="text"
                        icon={<UnderlineOutlined />}
                        onClick={() => executeCmd('underline')}
                      />
                    </Tooltip>
                    <Tooltip title="Strikethrough">
                      <Button
                        size="small"
                        type="text"
                        icon={<StrikethroughOutlined />}
                        onClick={() => executeCmd('strikeThrough')}
                      />
                    </Tooltip>
                    <Tooltip title="Inline Code">
                      <Button
                        size="small"
                        type="text"
                        icon={<CodeOutlined />}
                        onClick={() => {
                          const text = saveSelection()
                          if (text) {
                            restoreSelection()
                            document.execCommand('insertHTML', false, `<code>${text}</code>`)
                            handleEditorInput()
                          }
                        }}
                      />
                    </Tooltip>
                  </Space>

                  <Divider type="vertical" style={{ margin: '0 4px', height: 18 }} />

                  {/* Links & Media */}
                  <Space size={2} wrap>
                    <Tooltip title="Insert Link (Ctrl+K)">
                      <Button
                        size="small"
                        type="text"
                        icon={<LinkOutlined />}
                        onClick={openLinkModal}
                        style={{ color: '#1677ff' }}
                      />
                    </Tooltip>
                    <Tooltip title="Remove Link">
                      <Button
                        size="small"
                        type="text"
                        icon={<DisconnectOutlined />}
                        onClick={handleUnlink}
                      />
                    </Tooltip>
                    <Tooltip title="Insert Image">
                      <Button
                        size="small"
                        type="text"
                        icon={<PictureOutlined />}
                        onClick={openImageModal}
                      />
                    </Tooltip>
                  </Space>

                  <Divider type="vertical" style={{ margin: '0 4px', height: 18 }} />

                  {/* Lists & Layout */}
                  <Space size={2} wrap>
                    <Tooltip title="Bullet List">
                      <Button
                        size="small"
                        type="text"
                        icon={<UnorderedListOutlined />}
                        onClick={() => executeCmd('insertUnorderedList')}
                      />
                    </Tooltip>
                    <Tooltip title="Numbered List">
                      <Button
                        size="small"
                        type="text"
                        icon={<OrderedListOutlined />}
                        onClick={() => executeCmd('insertOrderedList')}
                      />
                    </Tooltip>
                    <Tooltip title="Divider Line">
                      <Button
                        size="small"
                        type="text"
                        icon={<MinusOutlined />}
                        onClick={handleInsertHr}
                      />
                    </Tooltip>
                    <Tooltip title="Insert Table">
                      <Button
                        size="small"
                        type="text"
                        icon={<TableOutlined />}
                        onClick={handleInsertTable}
                      />
                    </Tooltip>
                  </Space>

                  <Divider type="vertical" style={{ margin: '0 4px', height: 18 }} />

                  {/* Clean & History */}
                  <Space size={2} wrap>
                    <Tooltip title="Clear Formatting">
                      <Button
                        size="small"
                        type="text"
                        icon={<ClearOutlined />}
                        onClick={() => executeCmd('removeFormat')}
                      />
                    </Tooltip>
                    <Tooltip title="Undo (Ctrl+Z)">
                      <Button
                        size="small"
                        type="text"
                        icon={<UndoOutlined />}
                        onClick={() => executeCmd('undo')}
                      />
                    </Tooltip>
                    <Tooltip title="Redo (Ctrl+Y)">
                      <Button
                        size="small"
                        type="text"
                        icon={<RedoOutlined />}
                        onClick={() => executeCmd('redo')}
                      />
                    </Tooltip>
                    <Tooltip title="Direct Format (Cleans empty tags & unwanted styles)">
                      <Button
                        size="small"
                        type="dashed"
                        onClick={handleDirectClean}
                        style={{ fontSize: 11, padding: '0 8px' }}
                      >
                        Direct Format
                      </Button>
                    </Tooltip>
                  </Space>
                </div>

                {/* ContentEditable Visual Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  className="html-editor-content"
                  data-placeholder={placeholder}
                  onInput={handleEditorInput}
                  onKeyDown={handleKeyDown}
                  spellCheck="true"
                />
              </div>
            )
          },
          {
            key: 'code',
            label: (
              <span>
                <CodeOutlined style={{ marginRight: 6 }} />
                HTML Source
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Edit the direct HTML markup below. Changes immediately sync to the Visual Editor and Live Preview.
                  </Text>
                  <Space size="small">
                    <Button size="small" type="primary" onClick={handleDirectClean}>
                      Direct Format
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        // Quick beautify tags
                        const pretty = (value || '')
                          .replace(/>\s*</g, '>\n<')
                          .replace(/(<[^/][^>]*>)/g, '$1')
                        onChange?.(cleanHtmlOutput(pretty))
                        message.success('HTML formatted')
                      }}
                    >
                      Tidy HTML
                    </Button>
                  </Space>
                </div>
                <Input.TextArea
                  autoSize={{ minRows: 18, maxRows: 38 }}
                  value={value}
                  onChange={(e) => onChange?.(e.target.value)}
                  className="article-body-input"
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: 13,
                    lineHeight: 1.6
                  }}
                  placeholder="<p>Write or paste your custom HTML tags here...</p>"
                />
              </div>
            )
          },
          {
            key: 'preview',
            label: (
              <span>
                <EyeOutlined style={{ marginRight: 6 }} />
                Live Preview
              </span>
            ),
            children: (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {previewTheme === 'blog'
                      ? 'Simulating the live public blog reader layout on hexadelta.in'
                      : 'Simulating the dark terminal update reader'}
                  </Text>
                  <Space size="small">
                    <Text style={{ fontSize: 12 }}>Preview Theme:</Text>
                    <Segmented
                      size="small"
                      value={previewTheme}
                      onChange={setPreviewTheme}
                      options={[
                        { label: 'Blog View (Light)', value: 'blog' },
                        { label: 'Dark View', value: 'dark' }
                      ]}
                    />
                  </Space>
                </div>
                <div
                  className={previewTheme === 'blog' ? 'blog-reader-preview' : 'html-editor-preview'}
                  style={
                    previewTheme === 'blog'
                      ? {
                          minHeight: 350,
                          padding: '32px 36px',
                          background: '#ffffff',
                          color: '#1f2937',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }
                      : {
                          minHeight: 350,
                          padding: '24px 28px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 8,
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }
                  }
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(value || '<p><em>No content written yet.</em></p>')
                  }}
                />
              </div>
            )
          }
        ]}
      />

      {/* Footer Word & Character Counter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10,
          padding: '0 4px'
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} characters
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Mode: <Tag color="blue">{activeTab.toUpperCase()}</Tag>
        </Text>
      </div>

      {/* Link Dialog Modal */}
      <Modal
        title={linkUrl ? 'Edit Link' : 'Insert Link'}
        open={isLinkModalOpen}
        onCancel={() => setIsLinkModalOpen(false)}
        onOk={handleConfirmLink}
        okText="Save Link"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
              Display Text
            </label>
            <Input
              placeholder="e.g. HexaDelta Trading Terminal"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
              Link URL <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Input
              placeholder="https://example.com/blog/chart-features"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onPressEnter={handleConfirmLink}
              autoFocus
            />
          </div>

          <Checkbox
            checked={linkNewTab}
            onChange={(e) => setLinkNewTab(e.target.checked)}
          >
            Open in new tab (recommended for external links)
          </Checkbox>
        </div>
      </Modal>

      {/* Image Dialog Modal */}
      <Modal
        title="Insert Image"
        open={isImageModalOpen}
        onCancel={() => setIsImageModalOpen(false)}
        onOk={handleConfirmImage}
        okText="Insert Image"
        destroyOnClose
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
              Image URL <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Input
              placeholder="https://example.com/chart-screenshot.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onPressEnter={handleConfirmImage}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500 }}>
              Alt / Caption Text
            </label>
            <Input
              placeholder="e.g. HexaDelta Chart Drawing Tools"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
            />
          </div>

          {/* Quick Insert from Attached Images */}
          {(coverMedia?.url || galleryImages.length > 0) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                Quick insert from uploaded media:
              </Text>
              <Space wrap size="small">
                {coverMedia?.url && (
                  <Button
                    size="small"
                    onClick={() => {
                      setImageUrl(coverMedia.url)
                      setImageAlt('Cover photo')
                    }}
                  >
                    Insert Cover Photo
                  </Button>
                )}
                {galleryImages.map((img, i) => (
                  <Button
                    key={i}
                    size="small"
                    onClick={() => {
                      setImageUrl(img.url)
                      setImageAlt(img.caption || `Screenshot ${i + 1}`)
                    }}
                  >
                    Screenshot #{i + 1}
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
