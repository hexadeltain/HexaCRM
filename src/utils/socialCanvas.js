const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

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
 * High-resolution canvas rendering for Instagram/Social post export (1080p)
 */
export async function renderSocialPostToCanvas({
  headline = '',
  bodyText = '',
  cta = 'Read more on hexadelta blogs.',
  authorName = 'Mehul Rajodiya',
  avatarUrl = '/MehulRajodia.jpg',
  logoUrl = '/logo.png',
  brandName = 'Hexadelta.in',
  aspectRatio = 'portrait', // 'portrait' (4:5) | 'square' (1:1) | 'story' (9:16)
  theme = 'light',
  headlineWeight = '700' // '600' | '700' | '800'
}) {
  const isDark = theme === 'dark'
  const width = 1080
  let height = 1350 // Default 4:5 Instagram Portrait (1080x1350)
  if (aspectRatio === 'square') height = 1080
  if (aspectRatio === 'story') height = 1920

  // Ensure Google font Inter is loaded before canvas rasterizes text
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

  // Background
  ctx.fillStyle = isDark ? '#0f172a' : '#ffffff'
  ctx.fillRect(0, 0, width, height)

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

  const paddingX = 96
  const contentWidth = width - paddingX * 2
  let curY = 96

  // 1. Top Brand Header: SemiBold (600), clean and refined
  if (logoImg) {
    const logoSize = 52
    ctx.drawImage(logoImg, paddingX, curY, logoSize, logoSize)
    ctx.font = `600 34px ${FONT_FAMILY}`
    ctx.fillStyle = isDark ? '#ffffff' : '#111827'
    ctx.textBaseline = 'middle'
    ctx.fillText(brandName || 'Hexadelta.in', paddingX + logoSize + 18, curY + logoSize / 2)
    curY += logoSize + 85
  } else {
    ctx.font = `600 34px ${FONT_FAMILY}`
    ctx.fillStyle = isDark ? '#ffffff' : '#111827'
    ctx.textBaseline = 'top'
    ctx.fillText(brandName || 'Hexadelta.in', paddingX, curY)
    curY += 100
  }

  // 2. Headline / Title: Bold (700) with breathable 1.38 line height
  ctx.font = `${headlineWeight || '700'} 52px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
  ctx.textBaseline = 'top'
  const titleLineHeight = 74
  const titleLines = getCanvasWrappedLines(ctx, headline, contentWidth)
  for (const line of titleLines) {
    ctx.fillText(line, paddingX, curY)
    curY += titleLineHeight
  }

  // 3. Body / Excerpt: Regular (400) with comfortable 54px line height
  curY += 44
  ctx.font = `400 32px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? '#94a3b8' : '#262626'
  const bodyLineHeight = 54
  const bodyLines = getCanvasWrappedLines(ctx, bodyText, contentWidth)

  // Reserve space for CTA, divider and author footer
  const footerReserved = 240
  const maxBodyY = height - footerReserved - 100

  for (const line of bodyLines) {
    if (curY + bodyLineHeight > maxBodyY) {
      ctx.fillText(line + '...', paddingX, curY)
      curY += bodyLineHeight
      break
    }
    ctx.fillText(line, paddingX, curY)
    curY += bodyLineHeight
  }

  // 4. Call To Action (CTA): "Read more on " (400) + "hexadelta blogs." (700)
  curY += 44
  if (cta) {
    ctx.textBaseline = 'top'
    const prefix = 'Read more on '
    let highlight = 'hexadelta blogs.'
    let customText = cta

    if (cta.toLowerCase().startsWith('read more on ')) {
      highlight = cta.slice(13)
      ctx.font = `400 32px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#cbd5e1' : '#262626'
      ctx.fillText(prefix, paddingX, curY)
      const prefixWidth = ctx.measureText(prefix).width

      ctx.font = `700 32px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(highlight, paddingX + prefixWidth, curY)
    } else {
      ctx.font = `700 32px ${FONT_FAMILY}`
      ctx.fillStyle = isDark ? '#ffffff' : '#0f172a'
      ctx.fillText(customText, paddingX, curY)
    }
  }

  // 5. Divider Line
  const dividerY = height - 170
  ctx.strokeStyle = isDark ? '#334155' : '#e5e7eb'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(paddingX, dividerY)
  ctx.lineTo(width - paddingX, dividerY)
  ctx.stroke()

  // 6. Author Row: Circular avatar + Author name (700)
  const avatarY = height - 94
  const avatarRadius = 40
  const avatarCenterX = paddingX + avatarRadius

  if (avatarImg) {
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
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(avatarCenterX, avatarY, avatarRadius, 0, Math.PI * 2, true)
    ctx.stroke()
  }

  // Author Name
  ctx.font = `700 34px ${FONT_FAMILY}`
  ctx.fillStyle = isDark ? '#ffffff' : '#111827'
  ctx.textBaseline = 'middle'
  ctx.fillText(
    authorName || 'Mehul Rajodiya',
    avatarImg ? avatarCenterX + avatarRadius + 22 : paddingX,
    avatarY
  )

  return canvas
}
