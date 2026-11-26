const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

/**
 * Cross-browser rounded rectangle helper for canvas
 */
export function drawRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Text wrapping helper for HTML5 Canvas
 */
export function getCanvasWrappedLines(ctx, text, maxWidth) {
  if (!text) return []
  const paragraphs = text.split('\n')
  const result = []

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) {
      result.push('')
      continue
    }
    const words = trimmed.split(/\s+/)
    let currentLine = words[0] || ''

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const testLine = currentLine + ' ' + word
      const width = ctx.measureText(testLine).width
      if (width <= maxWidth) {
        currentLine = testLine
      } else {
        result.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) result.push(currentLine)
  }
  return result
}

/**
 * High-resolution canvas rendering for Instagram/Social post export (1080p / 1200p)
 */
export async function renderSocialPostToCanvas({
  headline = '',
  bodyText = '',
  cta = 'Read more on hexadelta blogs.',
  authorName = 'HexaDelta Team',
  avatarUrl = '/logo.png',
  logoUrl = '/logo.png',
  brandName = 'Hexadelta.in',
  aspectRatio = 'portrait', // 'portrait' (4:5) | 'square' (1:1) | 'story' (9:16) | 'banner' (16:9)
  theme = 'dark', // 'dark' (#141414, no blue) | 'light'
  headlineWeight = '700', // '600' | '700' | '800'
  layoutStyle = 'floating', // 'floating' (Image 3 smooth ambient depth) | 'minimal'
  gradientGlow = 'warm', // 'warm' | 'emerald' | 'onyx' | 'neutral'
  categoryTag = '',
  dateText = '',
  slideIndex = 1,
  totalSlides = 1
}) {
  const isDark = theme === 'dark'

  // Canvas Dimensions
  let width = 1080
  let height = 1350 // Default 4:5 Instagram Portrait
  if (aspectRatio === 'square') {
    width = 1080
    height = 1080
  } else if (aspectRatio === 'story') {
    width = 1080
    height = 1920
  } else if (aspectRatio === 'banner') {
    width = 1200
    height = 675
  }

  // Ensure Google font Inter is loaded before rasterizing text
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready
    } catch {}
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // Pre-load images
  const loadImage = (src) =>
    new Promise((resolve) => {
      if (!src) return resolve(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })

  const [logoImg, avatarImg] = await Promise.all([
    loadImage(logoUrl),
    loadImage(avatarUrl)
  ])

  // Pure dark background: strictly #141414 with no blue
  const DARK_BG = '#141414'
  const DARK_BORDER = '#262626'
  const DARK_TEXT_HEADING = '#ffffff'
  const DARK_TEXT_BODY = '#a3a3a3'
  const DARK_DIVIDER = '#262626'

  // 1. Draw Outer Ambient Backdrop (Depth / Gradient)
  if (layoutStyle === 'floating') {
    // Base Canvas Background
    ctx.fillStyle = isDark ? '#0c0c0c' : '#f8f8f8'
    ctx.fillRect(0, 0, width, height)

    if (gradientGlow === 'warm') {
      // Warm Amber Sunset Ambient Glow (Exact look from Image 3)
      const g1 = ctx.createRadialGradient(width * 0.82, height * 0.18, 40, width * 0.82, height * 0.18, width * 0.72)
      g1.addColorStop(0, isDark ? 'rgba(217, 119, 6, 0.38)' : 'rgba(245, 158, 11, 0.55)')
      g1.addColorStop(0.45, isDark ? 'rgba(234, 88, 12, 0.22)' : 'rgba(251, 146, 60, 0.35)')
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, width, height)

      const g2 = ctx.createRadialGradient(width * 0.18, height * 0.82, 30, width * 0.18, height * 0.82, width * 0.62)
      g2.addColorStop(0, isDark ? 'rgba(180, 83, 9, 0.25)' : 'rgba(253, 186, 116, 0.42)')
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, width, height)
    } else if (gradientGlow === 'emerald') {
      // HexaDelta Cyber Emerald Brand Glow
      const g1 = ctx.createRadialGradient(width * 0.82, height * 0.16, 40, width * 0.82, height * 0.16, width * 0.7)
      g1.addColorStop(0, isDark ? 'rgba(16, 185, 129, 0.32)' : 'rgba(52, 211, 153, 0.48)')
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, width, height)

      const g2 = ctx.createRadialGradient(width * 0.18, height * 0.84, 30, width * 0.18, height * 0.84, width * 0.6)
      g2.addColorStop(0, isDark ? 'rgba(5, 150, 105, 0.22)' : 'rgba(110, 231, 183, 0.35)')
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, width, height)
    } else if (gradientGlow === 'onyx') {
      // Pure Neutral Dark Depth (#141414) - zero blue
      const g1 = ctx.createRadialGradient(width * 0.5, height * 0.05, 50, width * 0.5, height * 0.05, width * 0.75)
      g1.addColorStop(0, isDark ? 'rgba(45, 45, 45, 0.5)' : 'rgba(220, 220, 220, 0.6)')
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, width, height)
    }
  } else {
    // Full-bleed flat background
    ctx.fillStyle = isDark ? DARK_BG : '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  // 2. Compute Floating Card Coordinates or Full-Bleed Bounds
  let cardX = 0
  let cardY = 0
  let cardWidth = width
  let cardHeight = height
  let paddingX = 96
  let curY = 96
  let contentWidth = width - paddingX * 2
  let dividerY = height - 170
  let avatarY = height - 94

  if (layoutStyle === 'floating') {
    const insetX = aspectRatio === 'banner' ? 52 : 68
    const insetY = aspectRatio === 'banner' ? 36 : 68
    cardX = insetX
    cardY = insetY
    cardWidth = width - insetX * 2
    cardHeight = height - insetY * 2
    const cardRadius = 32

    // Floating card drop shadow
    ctx.save()
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.16)'
    ctx.shadowBlur = 54
    ctx.shadowOffsetY = 24
    drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
    ctx.fillStyle = isDark ? DARK_BG : '#ffffff'
    ctx.fill()
    ctx.restore()

    // Inner Card Background Fill & Subtle Border
    drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
    ctx.fillStyle = isDark ? DARK_BG : '#ffffff'
    ctx.fill()
    ctx.strokeStyle = isDark ? DARK_BORDER : 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Interior paddings
    paddingX = cardX + (aspectRatio === 'banner' ? 56 : 76)
    contentWidth = cardWidth - (aspectRatio === 'banner' ? 112 : 152)
    curY = cardY + (aspectRatio === 'banner' ? 44 : 76)
    dividerY = cardY + cardHeight - (aspectRatio === 'banner' ? 95 : 155)
    avatarY = cardY + cardHeight - (aspectRatio === 'banner' ? 52 : 86)
  }

  // 3. Top Header: Logo + Brand Name + (Date Badge / Slide Counter)
  const logoSize = aspectRatio === 'banner' ? 42 : 52
  if (logoImg) {
    ctx.drawImage(logoImg, paddingX, curY, logoSize, logoSize)
    ctx.font = `600 ${aspectRatio === 'banner' ? 28 : 34}px ${FONT_FAMILY}`
    ctx.fillStyle = isDark ? '#ffffff' : '#111827'
    ctx.textBaseline = 'middle'
    ctx.fillText(brandName || 'Hexadelta.in', paddingX + logoSize + 18, curY + logoSize / 2)
  } else {
    ctx.font = `600 ${aspectRatio === 'banner' ? 28 : 34}px ${FONT_FAMILY}`
    ctx.fillStyle = isDark ? '#ffffff' : '#111827'
    ctx.textBaseline = 'top'
    ctx.fillText(brandName || 'Hexadelta.in', paddingX, curY)
  }

  // Right-aligned Header Meta (Slide Counter or Date)
  const headerRightText = totalSlides > 1 ? `${slideIndex} / ${totalSlides}` : dateText
  if (headerRightText) {
    ctx.font = `600 ${aspectRatio === 'banner' ? 22 : 26}px ${FONT_FAMILY}`
    ctx.fillStyle = isDark ? '#737373' : '#6b7280'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.fillText(headerRightText, paddingX + contentWidth, curY + logoSize / 2)
    ctx.textAlign = 'left' // Reset
  }

  curY += logoSize + (aspectRatio === 'banner' ? 36 : 64)

  // 4. Optional Category Tag Pill (e.g. "MARKET UPDATE")
  if (categoryTag) {
    ctx.font = `700 22px ${FONT_FAMILY}`
    const tagUpper = categoryTag.toUpperCase()
    const tagWidth = ctx.measureText(tagUpper).width + 32
    const tagHeight = 36
    drawRoundRect(ctx, paddingX, curY, tagWidth, tagHeight, 8)
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
    ctx.fill()
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = isDark ? '#10b981' : '#059669' // Emerald accent
    ctx.textBaseline = 'middle'
    ctx.fillText(tagUpper, paddingX + 16, curY + tagHeight / 2)
    curY += tagHeight + 20
  }

  // 5. Headline / Title: Inter Bold 700 with breathable vertical rhythm
  const titleSize = aspectRatio === 'banner' ? 40 : 50
  const titleLineHeight = aspectRatio === 'banner' ? 56 : 72
  ctx.font = `${headlineWeight || '700'} ${titleSize}px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? DARK_TEXT_HEADING : '#0f172a'
  ctx.textBaseline = 'top'

  const titleLines = getCanvasWrappedLines(ctx, headline, contentWidth)
  for (const line of titleLines) {
    ctx.fillText(line, paddingX, curY)
    curY += titleLineHeight
  }

  // 6. Body / Excerpt: Regular 400
  curY += aspectRatio === 'banner' ? 24 : 36
  const bodySize = aspectRatio === 'banner' ? 24 : 32
  const bodyLineHeight = aspectRatio === 'banner' ? 38 : 52
  ctx.font = `400 ${bodySize}px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? DARK_TEXT_BODY : '#262626'
  const bodyLines = getCanvasWrappedLines(ctx, bodyText, contentWidth)

  const maxBodyY = dividerY - (aspectRatio === 'banner' ? 60 : 100)

  for (const line of bodyLines) {
    if (curY + bodyLineHeight > maxBodyY) {
      ctx.fillText(line + '...', paddingX, curY)
      curY += bodyLineHeight
      break
    }
    ctx.fillText(line, paddingX, curY)
    curY += bodyLineHeight
  }

  // 7. Call To Action (CTA): "Read more on " (400) + "hexadelta blogs." (700)
  curY += aspectRatio === 'banner' ? 24 : 36
  if (cta && curY < dividerY - 40) {
    ctx.textBaseline = 'top'
    const prefix = 'Read more on '
    let highlight = 'hexadelta blogs.'
    let customText = cta

    if (cta.toLowerCase().startsWith('read more on ')) {
      highlight = cta.slice(13)
      ctx.font = `400 ${bodySize}px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#a3a3a3' : '#262626'
      ctx.fillText(prefix, paddingX, curY)
      const prefixWidth = ctx.measureText(prefix).width

      ctx.font = `700 ${bodySize}px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(highlight, paddingX + prefixWidth, curY)
    } else {
      ctx.font = `700 ${bodySize}px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(customText, paddingX, curY)
    }
  }

  // 8. Divider Line (Neutral #262626 on dark, no blue)
  ctx.strokeStyle = isDark ? DARK_DIVIDER : '#e5e7eb'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(paddingX, dividerY)
  ctx.lineTo(paddingX + contentWidth, dividerY)
  ctx.stroke()

  // 9. Author Row: Mehul photo or HexaDelta logo avatar
  const avatarRadius = aspectRatio === 'banner' ? 28 : 38
  const avatarCenterX = paddingX + avatarRadius

  if (avatarImg) {
    const isLogoAvatar = Boolean(avatarUrl && avatarUrl.includes('logo'))
    if (isLogoAvatar) {
      // HexaDelta Logo Avatar: circular container with logo centered
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarCenterX, avatarY, avatarRadius, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.fillStyle = isDark ? '#1a1a1a' : '#f4f4f5'
      ctx.fill()
      ctx.strokeStyle = isDark ? '#262626' : '#e5e7eb'
      ctx.lineWidth = 2
      ctx.stroke()

      const logoPadding = 8
      const logoDrawSize = (avatarRadius - logoPadding) * 2
      ctx.drawImage(
        avatarImg,
        avatarCenterX - logoDrawSize / 2,
        avatarY - logoDrawSize / 2,
        logoDrawSize,
        logoDrawSize
      )
      ctx.restore()
    } else {
      // Mehul Rajodiya Photo Avatar: clipped photo with subtle border
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarCenterX, avatarY, avatarRadius, 0, Math.PI * 2, true)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(
        avatarImg,
        avatarCenterX - avatarRadius,
        avatarY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      )
      ctx.restore()

      // Outer subtle border
      ctx.strokeStyle = isDark ? '#383838' : '#cbd5e1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(avatarCenterX, avatarY, avatarRadius, 0, Math.PI * 2, true)
      ctx.stroke()
    }
  }

  // Author Name
  const authorSize = aspectRatio === 'banner' ? 26 : 34
  ctx.font = `700 ${authorSize}px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? '#ffffff' : '#111827'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    authorName || 'HexaDelta Team',
    avatarImg ? avatarCenterX + avatarRadius + 20 : paddingX,
    avatarY
  )

  return canvas
}
