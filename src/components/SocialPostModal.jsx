import React, { useState, useEffect } from 'react'
import {
  Modal,
  Button,
  Space,
  Input,
  Segmented,
  Row,
  Col,
  Typography,
  Tag,
  message
} from 'antd'
import {
  DownloadOutlined,
  CopyOutlined,
  InstagramOutlined,
  UndoOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { stripHtml, slugify } from '../utils/markdown'
import { renderSocialPostToCanvas } from '../utils/socialCanvas'

const { Text } = Typography
const { TextArea } = Input

/**
 * Standalone Post Card Preview Component
 */
export function SocialPostCard({
  headline,
  bodyText,
  cta = 'Read more on hexadelta blogs.',
  authorName = 'Mehul Rajodiya',
  avatarUrl = '/MehulRajodia.jpg',
  logoUrl = '/logo.png',
  brandName = 'Hexadelta.in',
  aspectRatio = 'portrait',
  theme = 'light'
}) {
  const isDark = theme === 'dark'

  const aspectStyles = {
    portrait: { width: '100%', maxWidth: 420, minHeight: 525, aspectRatio: '4 / 5' },
    square: { width: '100%', maxWidth: 420, minHeight: 420, aspectRatio: '1 / 1' },
    story: { width: '100%', maxWidth: 360, minHeight: 640, aspectRatio: '9 / 16' }
  }

  return (
    <div
      className="social-post-card"
      style={{
        ...aspectStyles[aspectRatio],
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        borderRadius: 16,
        padding: '36px 36px 30px 36px',
        boxShadow: isDark
          ? '0 12px 36px rgba(0,0,0,0.45)'
          : '0 12px 36px rgba(0,0,0,0.07)',
        border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        position: 'relative',
        userSelect: 'none',
        margin: '0 auto'
      }}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <img
            src={logoUrl}
            alt={brandName}
            style={{ width: 26, height: 26, objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>
            {brandName}
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.25,
            color: isDark ? '#f8fafc' : '#0f172a',
            margin: '0 0 18px 0',
            letterSpacing: -0.3
          }}
        >
          {headline || 'Your Blog Headline Here'}
        </h2>

        {/* Body Text */}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: isDark ? '#94a3b8' : '#27272a',
            margin: '0 0 18px 0',
            whiteSpace: 'pre-wrap'
          }}
        >
          {bodyText || 'A compelling summary of the blog post explaining the key insights, trading strategies, or product announcement.'}
        </p>

        {/* CTA */}
        {cta && (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: isDark ? '#cbd5e1' : '#18181b',
              margin: '0 0 16px 0'
            }}
          >
            {cta.toLowerCase().startsWith('read more on ') ? (
              <>
                Read more on <strong>{cta.slice(13) || 'hexadelta blogs.'}</strong>
              </>
            ) : (
              <strong>{cta}</strong>
            )}
          </p>
        )}
      </div>

      {/* Footer with Divider and Author */}
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <div
          style={{
            borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            marginBottom: 16
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={avatarUrl}
            alt={authorName}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              objectFit: 'cover',
              border: isDark ? '2px solid #475569' : '2px solid #cbd5e1'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          >
            {authorName || 'Mehul Rajodiya'}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Main Social Post Modal for Generating, Customizing, and Exporting Posts
 */
export function SocialPostModal({ article, open, onClose }) {
  // Format & Theme states
  const [aspectRatio, setAspectRatio] = useState('portrait') // 'portrait' | 'square' | 'story'
  const [theme, setTheme] = useState('light') // 'light' | 'dark'

  // Editable Content states
  const [headline, setHeadline] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [cta, setCta] = useState('Read more on hexadelta blogs.')
  const [authorName, setAuthorName] = useState('Mehul Rajodiya')
  const avatarUrl = '/MehulRajodia.jpg'
  const logoUrl = '/logo.png'
  const [brandName, setBrandName] = useState('Hexadelta.in')

  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleReset = () => {
    if (article) {
      setHeadline(article.title || '')
      const initialBody = article.summary || stripHtml(article.body || '')
      setBodyText(
        initialBody.length > 280
          ? initialBody.slice(0, 275).trim() + '...'
          : initialBody
      )
      setAuthorName(article.author_name || 'Mehul Rajodiya')
      setCta('Read more on hexadelta blogs.')
    }
  }

  const handleDownload = async (format = 'png') => {
    try {
      setDownloading(true)
      const canvas = await renderSocialPostToCanvas({
        headline,
        bodyText,
        cta,
        authorName,
        avatarUrl,
        logoUrl,
        brandName,
        aspectRatio,
        theme
      })

      const filename = `${slugify(headline || 'hexadelta')}-social-${aspectRatio}.${format}`
      const link = document.createElement('a')
      link.download = filename
      link.href =
        format === 'jpeg'
          ? canvas.toDataURL('image/jpeg', 0.95)
          : canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success(`Downloaded high-res ${format.toUpperCase()} image!`)
    } catch (err) {
      console.error(err)
      message.error('Failed to generate image: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyClipboard = async () => {
    try {
      setCopying(true)
      const canvas = await renderSocialPostToCanvas({
        headline,
        bodyText,
        cta,
        authorName,
        avatarUrl,
        logoUrl,
        brandName,
        aspectRatio,
        theme
      })

      canvas.toBlob(async (blob) => {
        if (!blob) {
          message.error('Failed to create image blob')
          setCopying(false)
          return
        }

        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob })
            await navigator.clipboard.write([item])
            setCopied(true)
            message.success('Post image copied to clipboard! Ready to paste into Instagram, WhatsApp, or LinkedIn.')
            setTimeout(() => setCopied(false), 2500)
          } else {
            message.warning('Direct clipboard copy is not supported in this browser. Please use Download PNG.')
          }
        } catch (copyErr) {
          console.error(copyErr)
          message.error('Clipboard permission denied. Please click Download PNG.')
        } finally {
          setCopying(false)
        }
      }, 'image/png')
    } catch (err) {
      console.error(err)
      message.error('Failed to copy: ' + err.message)
      setCopying(false)
    }
  }

  if (!article && !open) return null

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InstagramOutlined style={{ fontSize: 20, color: '#e1306c' }} />
          <span>Social Media Marketing Post Generator</span>
          <Tag color="purple">Instagram / LinkedIn</Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={940}
      destroyOnClose
    >
      <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
        {/* Left Column: Edit Content & Settings */}
        <Col xs={24} md={12}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Format / Aspect Ratio
              </Text>
              <Segmented
                block
                value={aspectRatio}
                onChange={setAspectRatio}
                options={[
                  { label: '4:5 Portrait (IG Feed)', value: 'portrait' },
                  { label: '1:1 Square', value: 'square' },
                  { label: '9:16 Story', value: 'story' }
                ]}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Card Theme
              </Text>
              <Segmented
                block
                value={theme}
                onChange={setTheme}
                options={[
                  { label: 'Clean White (Recommended)', value: 'light' },
                  { label: 'Dark Terminal', value: 'dark' }
                ]}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text strong>Post Headline</Text>
                <Button type="link" size="small" icon={<UndoOutlined />} onClick={handleReset} style={{ padding: 0 }}>
                  Reset to Article
                </Button>
              </div>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="What happens when a stock enters in ban list?"
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Post Description / Excerpt
              </Text>
              <TextArea
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="How options selling in ban period can be so much fun trading..."
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Call To Action
              </Text>
              <Input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Read more on hexadelta blogs."
              />
            </div>

            <Row gutter={12}>
              <Col span={12}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Author Name
                </Text>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Mehul Rajodiya"
                />
              </Col>
              <Col span={12}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Brand Text
                </Text>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Hexadelta.in"
                />
              </Col>
            </Row>

            <div style={{ paddingTop: 8 }}>
              <Space wrap size="middle">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={() => handleDownload('png')}
                >
                  Download PNG (1080p)
                </Button>

                <Button
                  icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                  loading={copying}
                  onClick={handleCopyClipboard}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>

                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload('jpeg')}
                >
                  JPEG
                </Button>
              </Space>
            </div>
          </div>
        </Col>

        {/* Right Column: Live WYSIWYG Preview */}
        <Col
          xs={24}
          md={12}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 12,
            padding: 20
          }}
        >
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            Live Social Media Post Preview:
          </Text>

          <SocialPostCard
            headline={headline}
            bodyText={bodyText}
            cta={cta}
            authorName={authorName}
            avatarUrl={avatarUrl}
            logoUrl={logoUrl}
            brandName={brandName}
            aspectRatio={aspectRatio}
            theme={theme}
          />
        </Col>
      </Row>
    </Modal>
  )
}
