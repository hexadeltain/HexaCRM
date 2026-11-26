import React, { useState } from 'react'
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
  Switch,
  message,
  Tooltip,
  Radio
} from 'antd'
import {
  DownloadOutlined,
  CopyOutlined,
  InstagramOutlined,
  UndoOutlined,
  CheckOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons'
import { stripHtml, slugify, formatDate } from '../utils/markdown'
import { renderSocialPostToCanvas } from '../utils/socialCanvas'

const { Text } = Typography
const { TextArea } = Input

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

/**
 * Intelligent helper to split an entire blog article into sequential carousel slides
 */
function splitArticleIntoSlides(article) {
  const title = article?.title || 'HexaDelta Update'
  const summary = article?.summary || ''
  const rawBody = article?.body || ''

  const slides = []

  // Slide 1: Cover / Intro Slide
  slides.push({
    headline: title,
    bodyText: summary || (stripHtml(rawBody).slice(0, 220).trim() + '...'),
    cta: 'Swipe for details ➡️'
  })

  // Extract sections by headings (<h2>, <h3>, or markdown ##, ###)
  const headingRegex = /(?:<h[2-4][^>]*>(.*?)<\/h[2-4]>|^#{2,3}\s+(.*$))/gim
  const matches = []
  let match
  while ((match = headingRegex.exec(rawBody)) !== null) {
    const headingText = (match[1] || match[2] || '').trim()
    if (headingText) {
      matches.push({
        heading: stripHtml(headingText),
        index: match.index
      })
    }
  }

  if (matches.length >= 2) {
    // We have section headings! Create a slide for each section (up to 5 slides)
    for (let i = 0; i < matches.length && slides.length < 6; i++) {
      const current = matches[i]
      const next = matches[i + 1]
      const sectionRaw = next
        ? rawBody.slice(current.index, next.index)
        : rawBody.slice(current.index)

      const cleanSection = stripHtml(sectionRaw)
        .replace(current.heading, '')
        .trim()

      if (cleanSection) {
        slides.push({
          headline: current.heading,
          bodyText: cleanSection.length > 250 ? cleanSection.slice(0, 245).trim() + '...' : cleanSection,
          cta: i === matches.length - 1 ? 'Read more on hexadelta blogs.' : 'Continued ➡️'
        })
      }
    }
  } else {
    // No headings found: break plain body paragraphs into slides
    const plainText = stripHtml(rawBody)
    const paragraphs = plainText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30)

    if (paragraphs.length > 1) {
      let currentChunk = ''
      for (const p of paragraphs.slice(1)) {
        if ((currentChunk + ' ' + p).length < 240) {
          currentChunk += (currentChunk ? '\n\n' : '') + p
        } else {
          if (currentChunk && slides.length < 5) {
            slides.push({
              headline: `${title} (Part ${slides.length + 1})`,
              bodyText: currentChunk,
              cta: 'Continued ➡️'
            })
          }
          currentChunk = p
        }
      }
      if (currentChunk && slides.length < 5) {
        slides.push({
          headline: 'Key Takeaways',
          bodyText: currentChunk,
          cta: 'Read more on hexadelta blogs.'
        })
      }
    }
  }

  // Ensure last slide has the final CTA
  if (slides.length > 1) {
    slides[slides.length - 1].cta = 'Read more on hexadelta blogs.'
  }

  // Fallback if only 1 slide was created
  if (slides.length === 1) {
    slides.push({
      headline: 'Highlights & Overview',
      bodyText: summary || 'Explore all features and chart capabilities directly on HexaDelta.',
      cta: 'Read more on hexadelta blogs.'
    })
  }

  return slides
}

/**
 * Backdrop styles for the Floating Depth mode (matching Image 3)
 */
function getBackdropStyle(theme, gradientGlow) {
  const isDark = theme === 'dark'

  if (gradientGlow === 'warm') {
    // Warm Amber / Sunset Glow (Image 3 reference)
    if (isDark) {
      return {
        background: `radial-gradient(circle at 82% 18%, rgba(217, 119, 6, 0.35) 0%, rgba(234, 88, 12, 0.18) 40%, transparent 70%),
                     radial-gradient(circle at 18% 82%, rgba(180, 83, 9, 0.22) 0%, transparent 60%),
                     #0c0c0c`
      }
    }
    return {
      background: `radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.55) 0%, rgba(251, 146, 60, 0.35) 38%, transparent 70%),
                   radial-gradient(circle at 15% 85%, rgba(253, 186, 116, 0.42) 0%, transparent 60%),
                   #fdfbf7`
    }
  }

  if (gradientGlow === 'emerald') {
    // HexaDelta Cyber Emerald Brand Glow
    if (isDark) {
      return {
        background: `radial-gradient(circle at 82% 16%, rgba(16, 185, 129, 0.32) 0%, transparent 65%),
                     radial-gradient(circle at 18% 84%, rgba(5, 150, 105, 0.2) 0%, transparent 60%),
                     #0c0c0c`
      }
    }
    return {
      background: `radial-gradient(circle at 85% 15%, rgba(52, 211, 153, 0.48) 0%, transparent 65%),
                   radial-gradient(circle at 15% 85%, rgba(110, 231, 183, 0.32) 0%, transparent 60%),
                   #f4fbf7`
    }
  }

  if (gradientGlow === 'onyx') {
    // Pure neutral dark depth (#141414, strictly no blue!)
    if (isDark) {
      return {
        background: `radial-gradient(circle at 50% 5%, rgba(45, 45, 45, 0.5) 0%, transparent 65%),
                     #0d0d0d`
      }
    }
    return {
      background: `radial-gradient(circle at 50% 5%, rgba(220, 220, 220, 0.6) 0%, transparent 65%),
                   #f4f4f5`
    }
  }

  // Clean neutral
  return {
    background: isDark ? '#0d0d0d' : '#f4f4f5'
  }
}

/**
 * Standalone Post Card Preview Component
 */
export function SocialPostCard({
  headline,
  bodyText,
  cta = 'Read more on hexadelta blogs.',
  authorName = 'HexaDelta Team',
  avatarUrl = '/logo.png',
  logoUrl = '/logo.png',
  brandName = 'Hexadelta.in',
  aspectRatio = 'portrait',
  theme = 'dark',
  headlineWeight = '700',
  layoutStyle = 'floating',
  gradientGlow = 'warm',
  categoryTag = '',
  dateText = '',
  slideIndex = 1,
  totalSlides = 1
}) {
  const isDark = theme === 'dark'

  const aspectStyles = {
    portrait: { width: '100%', maxWidth: 420, minHeight: 525, aspectRatio: '4 / 5' },
    square: { width: '100%', maxWidth: 420, minHeight: 420, aspectRatio: '1 / 1' },
    story: { width: '100%', maxWidth: 360, minHeight: 640, aspectRatio: '9 / 16' },
    banner: { width: '100%', maxWidth: 480, minHeight: 270, aspectRatio: '16 / 9' }
  }

  const numericWeight = headlineWeight === '800' ? 800 : headlineWeight === '600' ? 600 : 700

  // Pure dark colors: strictly #141414 with neutral tones and no blue
  const DARK_BG = '#141414'
  const DARK_BORDER = '#262626'
  const DARK_HEADING = '#ffffff'
  const DARK_BODY = '#a3a3a3'
  const DARK_CTA = '#e5e5e5'
  const DARK_DIVIDER = '#262626'

  const isLogoAvatar = Boolean(avatarUrl && avatarUrl.includes('logo'))

  const cardContent = (
    <div
      style={{
        background: isDark ? DARK_BG : '#ffffff',
        color: isDark ? '#f5f5f5' : '#0f172a',
        borderRadius: layoutStyle === 'floating' ? 18 : 16,
        padding: layoutStyle === 'floating' ? '30px 28px 24px 28px' : '36px 36px 30px 36px',
        boxShadow:
          layoutStyle === 'floating'
            ? isDark
              ? '0 24px 60px rgba(0,0,0,0.7), 0 2px 10px rgba(0,0,0,0.5)'
              : '0 24px 50px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)'
            : isDark
            ? '0 12px 36px rgba(0,0,0,0.45)'
            : '0 12px 36px rgba(0,0,0,0.07)',
        border: isDark ? `1px solid ${DARK_BORDER}` : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        position: 'relative',
        userSelect: 'none',
        width: '100%',
        height: layoutStyle === 'floating' ? '100%' : 'auto'
      }}
    >
      {/* Top Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={logoUrl}
              alt={brandName}
              style={{ width: 24, height: 24, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 15,
                fontWeight: 600,
                color: isDark ? '#ffffff' : '#111827',
                letterSpacing: 0
              }}
            >
              {brandName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {totalSlides > 1 ? (
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  color: isDark ? '#a3a3a3' : '#6b7280',
                  border: isDark ? '1px solid #262626' : '1px solid #e5e7eb'
                }}
              >
                {slideIndex} / {totalSlides}
              </span>
            ) : (
              dateText && (
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: 12,
                    fontWeight: 500,
                    color: isDark ? '#737373' : '#6b7280'
                  }}
                >
                  {dateText}
                </span>
              )
            )}
          </div>
        </div>

     

        {/* Headline */}
        <h2
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: aspectRatio === 'banner' ? 20 : 22,
            fontWeight: numericWeight,
            lineHeight: 1.36,
            color: isDark ? DARK_HEADING : '#0f172a',
            margin: '0 0 16px 0',
            letterSpacing: '-0.015em'
          }}
        >
          {headline || 'Your Blog Headline Here'}
        </h2>

        {/* Body Text */}
        <p
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: aspectRatio === 'banner' ? 13 : 14,
            fontWeight: 400,
            lineHeight: 1.65,
            color: isDark ? DARK_BODY : '#262626',
            margin: '0 0 16px 0',
            whiteSpace: 'pre-wrap'
          }}
        >
          {bodyText || 'A compelling summary of the blog post explaining the key insights, trading strategies, or product announcement.'}
        </p>

        {/* CTA */}
        {cta && (
          <p
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 13.5,
              fontWeight: 400,
              lineHeight: 1.5,
              color: isDark ? DARK_CTA : '#262626',
              margin: '0 0 14px 0'
            }}
          >
            {cta.toLowerCase().startsWith('read more on ') ? (
              <>
                Read more on{' '}
                <strong style={{ fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>
                  {cta.slice(13) || 'hexadelta blogs.'}
                </strong>
              </>
            ) : (
              <strong style={{ fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>
                {cta}
              </strong>
            )}
          </p>
        )}
      </div>

      {/* Footer with Divider and Author */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div
          style={{
            borderTop: isDark ? `1px solid ${DARK_DIVIDER}` : '1px solid #e5e7eb',
            marginBottom: 14
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={avatarUrl}
            alt={authorName}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              objectFit: isLogoAvatar ? 'contain' : 'cover',
              padding: isLogoAvatar ? 5 : 0,
              background: isDark ? '#1a1a1a' : '#f4f4f5',
              border: isDark ? '2px solid #262626' : '2px solid #cbd5e1'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 14.5,
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#111827'
            }}
          >
            {authorName || 'HexaDelta Team'}
          </span>
        </div>
      </div>
    </div>
  )

  if (layoutStyle === 'floating') {
    return (
      <div
        className="social-post-card"
        style={{
          ...aspectStyles[aspectRatio],
          ...getBackdropStyle(theme, gradientGlow),
          padding: aspectRatio === 'banner' ? '18px 22px' : '28px 24px',
          borderRadius: 22,
          border: isDark ? '1px solid #202020' : '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          margin: '0 auto',
          transition: 'all 0.3s ease'
        }}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <div
      className="social-post-card"
      style={{
        ...aspectStyles[aspectRatio],
        margin: '0 auto'
      }}
    >
      {cardContent}
    </div>
  )
}

function SocialPostForm({ article }) {
  // Author Profile logic:
  // If author is Mehul -> use Mehul photo
  // Otherwise -> default to HexaDelta Team with HexaDelta logo avatar
  const initialAuthorName = article?.author_name || 'HexaDelta Team'
  const isMehul = initialAuthorName.toLowerCase().includes('mehul')

  const [authorType, setAuthorType] = useState(isMehul ? 'mehul' : 'hexadelta')
  const [authorName, setAuthorName] = useState(isMehul ? 'Mehul Rajodiya' : initialAuthorName)
  const [avatarUrl, setAvatarUrl] = useState(isMehul ? '/MehulRajodia.jpg' : '/logo.png')

  // Mode: Single Slide vs Full Blog Multi-Page Carousel
  const [postMode, setPostMode] = useState('single') // 'single' | 'carousel'

  // Presets & Styles
  const [aspectRatio, setAspectRatio] = useState('portrait') // 'portrait' | 'square' | 'story' | 'banner'
  const [theme, setTheme] = useState('dark') // 'dark' (#141414) | 'light'
  const [layoutStyle, setLayoutStyle] = useState('floating') // 'floating' (ambient depth) | 'minimal'
  const [gradientGlow, setGradientGlow] = useState('warm') // 'warm' (Image 3) | 'emerald' | 'onyx' | 'neutral'
  const [headlineWeight, setHeadlineWeight] = useState('700') // '600' | '700' | '800'

  // Editable Single Slide Content
  const defaultHeadline = article?.title || ''
  const rawBody = article?.summary || stripHtml(article?.body || '')
  const defaultBody = rawBody.length > 280 ? rawBody.slice(0, 275).trim() + '...' : rawBody
  const defaultDate = article?.published_at ? formatDate(article.published_at) : 'December 8, 2026'

  const [singleHeadline, setSingleHeadline] = useState(defaultHeadline)
  const [singleBodyText, setSingleBodyText] = useState(defaultBody)
  const [singleCta, setSingleCta] = useState('Read more on hexadelta blogs.')

  // Multi-Page Carousel Slides
  const [slides, setSlides] = useState(() => splitArticleIntoSlides(article))
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)

  const [categoryTag, setCategoryTag] = useState(article?.category ? article.category.toUpperCase() : 'BLOG')
  const [showDate, setShowDate] = useState(true)
  const [dateText, setDateText] = useState(defaultDate)

  const logoUrl = '/logo.png'
  const [brandName, setBrandName] = useState('Hexadelta.in')

  const [downloading, setDownloading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  // Switch Author Setting
  const handleAuthorTypeChange = (val) => {
    setAuthorType(val)
    if (val === 'mehul') {
      setAuthorName('Mehul Rajodiya')
      setAvatarUrl('/MehulRajodia.jpg')
    } else if (val === 'hexadelta') {
      setAuthorName('HexaDelta Team')
      setAvatarUrl('/logo.png')
    }
  }

  // Active slide getters and setters
  const currentSlide = postMode === 'carousel'
    ? slides[activeSlideIndex] || slides[0]
    : { headline: singleHeadline, bodyText: singleBodyText, cta: singleCta }

  const handleUpdateCurrentSlide = (field, value) => {
    if (postMode === 'single') {
      if (field === 'headline') setSingleHeadline(value)
      if (field === 'bodyText') setSingleBodyText(value)
      if (field === 'cta') setSingleCta(value)
    } else {
      setSlides((prev) => {
        const next = [...prev]
        next[activeSlideIndex] = {
          ...next[activeSlideIndex],
          [field]: value
        }
        return next
      })
    }
  }

  const handleAddSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        headline: `Page ${prev.length + 1}`,
        bodyText: 'Continue reading the key insights and chart updates...',
        cta: 'Read more on hexadelta blogs.'
      }
    ])
    setActiveSlideIndex(slides.length)
  }

  const handleDeleteSlide = (index) => {
    if (slides.length <= 1) {
      message.warning('At least 1 slide is required')
      return
    }
    setSlides((prev) => prev.filter((_, i) => i !== index))
    setActiveSlideIndex((prev) => Math.max(0, Math.min(prev, slides.length - 2)))
  }

  const handleReset = () => {
    if (isMehul) {
      setAuthorType('mehul')
      setAuthorName('Mehul Rajodiya')
      setAvatarUrl('/MehulRajodia.jpg')
    } else {
      setAuthorType('hexadelta')
      setAuthorName('HexaDelta Team')
      setAvatarUrl('/logo.png')
    }
    setSingleHeadline(defaultHeadline)
    setSingleBodyText(defaultBody)
    setSingleCta('Read more on hexadelta blogs.')
    setSlides(splitArticleIntoSlides(article))
    setActiveSlideIndex(0)
    setHeadlineWeight('700')
    setCategoryTag(article?.category ? article.category.toUpperCase() : 'BLOG')
    setDateText(defaultDate)
    setBrandName('Hexadelta.in')
  }

  // Download Current Slide
  const handleDownloadCurrent = async (format = 'png') => {
    try {
      setDownloading(true)
      const canvas = await renderSocialPostToCanvas({
        headline: currentSlide.headline,
        bodyText: currentSlide.bodyText,
        cta: currentSlide.cta,
        authorName,
        avatarUrl,
        logoUrl,
        brandName,
        aspectRatio,
        theme,
        headlineWeight,
        layoutStyle,
        gradientGlow,
        categoryTag: categoryTag.trim(),
        dateText: showDate ? dateText : '',
        slideIndex: postMode === 'carousel' ? activeSlideIndex + 1 : 1,
        totalSlides: postMode === 'carousel' ? slides.length : 1
      })

      const suffix = postMode === 'carousel' ? `-page-${activeSlideIndex + 1}` : ''
      const filename = `${slugify(currentSlide.headline || 'hexadelta')}${suffix}.${format}`
      const link = document.createElement('a')
      link.download = filename
      link.href =
        format === 'jpeg'
          ? canvas.toDataURL('image/jpeg', 0.95)
          : canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success(`Downloaded page ${postMode === 'carousel' ? activeSlideIndex + 1 : ''} high-res ${format.toUpperCase()}!`)
    } catch (err) {
      console.error(err)
      message.error('Failed to generate image: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  // Download All Carousel Pages sequentially
  const handleDownloadAllPages = async () => {
    try {
      setDownloadingAll(true)
      message.loading({ content: `Generating all ${slides.length} blog pages in 1080p...`, key: 'downloadAll' })

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const canvas = await renderSocialPostToCanvas({
          headline: slide.headline,
          bodyText: slide.bodyText,
          cta: slide.cta,
          authorName,
          avatarUrl,
          logoUrl,
          brandName,
          aspectRatio,
          theme,
          headlineWeight,
          layoutStyle,
          gradientGlow,
          categoryTag: categoryTag.trim(),
          dateText: showDate ? dateText : '',
          slideIndex: i + 1,
          totalSlides: slides.length
        })

        const filename = `${slugify(defaultHeadline || 'hexadelta')}-page-${i + 1}.png`
        const link = document.createElement('a')
        link.download = filename
        link.href = canvas.toDataURL('image/png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        if (i < slides.length - 1) {
          await new Promise((r) => setTimeout(r, 260))
        }
      }

      message.success({ content: `Downloaded all ${slides.length} blog pages successfully!`, key: 'downloadAll' })
    } catch (err) {
      console.error(err)
      message.error({ content: 'Failed to download all pages: ' + err.message, key: 'downloadAll' })
    } finally {
      setDownloadingAll(false)
    }
  }

  // Copy Current Slide to Clipboard
  const handleCopyClipboard = async () => {
    try {
      setCopying(true)
      const canvas = await renderSocialPostToCanvas({
        headline: currentSlide.headline,
        bodyText: currentSlide.bodyText,
        cta: currentSlide.cta,
        authorName,
        avatarUrl,
        logoUrl,
        brandName,
        aspectRatio,
        theme,
        headlineWeight,
        layoutStyle,
        gradientGlow,
        categoryTag: categoryTag.trim(),
        dateText: showDate ? dateText : '',
        slideIndex: postMode === 'carousel' ? activeSlideIndex + 1 : 1,
        totalSlides: postMode === 'carousel' ? slides.length : 1
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

  return (
    <Row gutter={[24, 24]} style={{ marginTop: 14 }}>
      {/* Left Column: Edit Content & Settings */}
      <Col xs={24} md={12}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Post Mode: Single vs Multi-Page Carousel */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <FileTextOutlined style={{ marginRight: 6 }} /> Post Type
            </Text>
            <Segmented
              block
              value={postMode}
              onChange={setPostMode}
              options={[
                { label: 'Single Slide (Summary)', value: 'single' },
                { label: 'Multi-Page Carousel (Full Blog)', value: 'carousel' }
              ]}
            />
          </div>

          {/* Author & Avatar Setting (User's specific rule: Mehul -> Photo, otherwise HexaDelta logo) */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              <UserOutlined style={{ marginRight: 6 }} /> Author & Avatar Setting
            </Text>
            <Segmented
              block
              value={authorType}
              onChange={handleAuthorTypeChange}
              options={[
                { label: 'Mehul Rajodiya (Photo)', value: 'mehul' },
                { label: 'HexaDelta Team (Logo)', value: 'hexadelta' },
                { label: 'Custom', value: 'custom' }
              ]}
            />
          </div>

          {authorType === 'custom' && (
            <Row gutter={12}>
              <Col span={14}>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author name"
                />
              </Col>
              <Col span={10}>
                <Radio.Group
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="/MehulRajodia.jpg">Mehul</Radio.Button>
                  <Radio.Button value="/logo.png">Logo</Radio.Button>
                </Radio.Group>
              </Col>
            </Row>
          )}

          {/* Layout & Glow Preset */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text strong>
                <LayoutOutlined style={{ marginRight: 6 }} /> Layout Depth Style
              </Text>
            </div>
            <Segmented
              block
              value={layoutStyle}
              onChange={setLayoutStyle}
              options={[
                { label: 'Ambient Depth (Image 3)', value: 'floating' },
                { label: 'Full Bleed Minimal', value: 'minimal' }
              ]}
            />
          </div>

          {/* Ambient Glow Palette (when Floating depth is enabled) */}
          {layoutStyle === 'floating' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <BgColorsOutlined style={{ marginRight: 6 }} /> Gradient Glow Backdrop
              </Text>
              <Segmented
                block
                value={gradientGlow}
                onChange={setGradientGlow}
                options={[
                  { label: 'Warm Sunset (Image 3)', value: 'warm' },
                  { label: 'Hexa Emerald', value: 'emerald' },
                  { label: 'Dark Onyx (#141414)', value: 'onyx' },
                  { label: 'Neutral', value: 'neutral' }
                ]}
              />
            </div>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Card Theme
              </Text>
              <Segmented
                block
                value={theme}
                onChange={setTheme}
                options={[
                  { label: 'Dark (#141414)', value: 'dark' },
                  { label: 'Clean White', value: 'light' }
                ]}
              />
            </Col>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Headline Weight
              </Text>
              <Segmented
                block
                value={headlineWeight}
                onChange={setHeadlineWeight}
                options={[
                  { label: 'Bold (700)', value: '700' },
                  { label: 'Semi (600)', value: '600' },
                  { label: 'Heavy (800)', value: '800' }
                ]}
              />
            </Col>
          </Row>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Format / Aspect Ratio
            </Text>
            <Segmented
              block
              value={aspectRatio}
              onChange={setAspectRatio}
              options={[
                { label: '4:5 Feed', value: 'portrait' },
                { label: '1:1 Square', value: 'square' },
                { label: '9:16 Story', value: 'story' },
                { label: '16:9 Banner', value: 'banner' }
              ]}
            />
          </div>

          {/* Carousel Slide Switcher */}
          {postMode === 'carousel' && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: '10px 14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>
                  Editing Slide {activeSlideIndex + 1} of {slides.length}
                </Text>
                <Space size="small">
                  <Button
                    size="small"
                    icon={<LeftOutlined />}
                    disabled={activeSlideIndex === 0}
                    onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                  />
                  <Button
                    size="small"
                    icon={<RightOutlined />}
                    disabled={activeSlideIndex === slides.length - 1}
                    onClick={() => setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                  />
                  <Tooltip title="Add New Slide">
                    <Button size="small" icon={<PlusOutlined />} onClick={handleAddSlide} />
                  </Tooltip>
                  {slides.length > 1 && (
                    <Tooltip title="Delete Current Slide">
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteSlide(activeSlideIndex)}
                      />
                    </Tooltip>
                  )}
                </Space>
              </div>

              {/* Jump to Slide Pills */}
              <Space wrap size="small">
                {slides.map((_, i) => (
                  <Button
                    key={i}
                    size="small"
                    type={i === activeSlideIndex ? 'primary' : 'default'}
                    onClick={() => setActiveSlideIndex(i)}
                  >
                    Page {i + 1}
                  </Button>
                ))}
              </Space>
            </div>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Category Pill Tag
              </Text>
              <Input
                value={categoryTag}
                onChange={(e) => setCategoryTag(e.target.value)}
                placeholder="e.g. BLOG or WHAT'S NEW"
                allowClear
              />
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text strong>Show Date</Text>
                <Switch size="small" checked={showDate} onChange={setShowDate} />
              </div>
              <Input
                disabled={!showDate}
                value={dateText}
                onChange={(e) => setDateText(e.target.value)}
                placeholder="December 8, 2026"
              />
            </Col>
          </Row>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text strong>
                {postMode === 'carousel' ? `Slide ${activeSlideIndex + 1} Headline` : 'Post Headline'}
              </Text>
              <Button type="link" size="small" icon={<UndoOutlined />} onClick={handleReset} style={{ padding: 0 }}>
                Reset
              </Button>
            </div>
            <Input
              value={currentSlide.headline}
              onChange={(e) => handleUpdateCurrentSlide('headline', e.target.value)}
              placeholder="What happens when a stock enters in ban list?"
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              {postMode === 'carousel' ? `Slide ${activeSlideIndex + 1} Content` : 'Post Description / Excerpt'}
            </Text>
            <TextArea
              rows={3}
              value={currentSlide.bodyText}
              onChange={(e) => handleUpdateCurrentSlide('bodyText', e.target.value)}
              placeholder="How options selling in ban period can be so much fun trading..."
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Call To Action
            </Text>
            <Input
              value={currentSlide.cta}
              onChange={(e) => handleUpdateCurrentSlide('cta', e.target.value)}
              placeholder="Read more on hexadelta blogs."
            />
          </div>

          {/* Export Actions Bar */}
          <div style={{ paddingTop: 6 }}>
            <Space wrap size="middle">
              {postMode === 'carousel' && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloadingAll}
                  onClick={handleDownloadAllPages}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Download All Pages ({slides.length} PNGs)
                </Button>
              )}

              <Button
                type={postMode === 'single' ? 'primary' : 'default'}
                icon={<DownloadOutlined />}
                loading={downloading}
                onClick={() => handleDownloadCurrent('png')}
              >
                {postMode === 'carousel' ? `Download Page ${activeSlideIndex + 1} (PNG)` : 'Download PNG (1080p)'}
              </Button>

              <Button
                icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                loading={copying}
                onClick={handleCopyClipboard}
              >
                {copied ? 'Copied!' : 'Copy Current Page'}
              </Button>

              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadCurrent('jpeg')}
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
          background: 'rgba(0, 0, 0, 0.04)',
          borderRadius: 14,
          padding: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Live Preview:
            </Text>
            {postMode === 'carousel' && (
              <Tag color="purple">
                Slide {activeSlideIndex + 1} of {slides.length}
              </Tag>
            )}
          </Space>
          <Tag color={theme === 'dark' ? 'default' : 'blue'}>
            {theme === 'dark' ? 'Dark #141414' : 'Clean White'}
          </Tag>
        </div>

        <SocialPostCard
          headline={currentSlide.headline}
          bodyText={currentSlide.bodyText}
          cta={currentSlide.cta}
          authorName={authorName}
          avatarUrl={avatarUrl}
          logoUrl={logoUrl}
          brandName={brandName}
          aspectRatio={aspectRatio}
          theme={theme}
          headlineWeight={headlineWeight}
          layoutStyle={layoutStyle}
          gradientGlow={gradientGlow}
          categoryTag={categoryTag}
          dateText={showDate ? dateText : ''}
          slideIndex={activeSlideIndex + 1}
          totalSlides={postMode === 'carousel' ? slides.length : 1}
        />

        {/* Carousel quick pager below preview */}
        {postMode === 'carousel' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <Button
              size="small"
              icon={<LeftOutlined />}
              disabled={activeSlideIndex === 0}
              onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
            >
              Prev Page
            </Button>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              {activeSlideIndex + 1} / {slides.length}
            </Text>
            <Button
              size="small"
              icon={<RightOutlined />}
              disabled={activeSlideIndex === slides.length - 1}
              onClick={() => setActiveSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
            >
              Next Page
            </Button>
          </div>
        )}
      </Col>
    </Row>
  )
}

/**
 * Main Social Post Modal for Generating, Customizing, and Exporting Posts
 */
export function SocialPostModal({ article, open, onClose }) {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InstagramOutlined style={{ fontSize: 20, color: '#e1306c' }} />
          <span>Social Media Marketing Post Generator</span>
          <Tag color="purple">Instagram / LinkedIn / Twitter</Tag>
        </div>
      }
      open={open && Boolean(article)}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      {article && <SocialPostForm key={article.id || article.title || 'post'} article={article} />}
    </Modal>
  )
}
