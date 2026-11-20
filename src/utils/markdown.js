// Lightweight, secure Markdown-to-HTML and HTML sanitizer (0 dependencies, standard library regex)
import { normalizeMediaUrl } from './media'

export function isHtml(text = '') {
  if (!text || typeof text !== 'string') return false
  return (
    /<\/?(?:p|h[1-6]|div|span|ul|ol|li|blockquote|a|strong|b|em|i|u|s|del|table|thead|tbody|tr|td|th|pre|code|img|br|hr)\b/i.test(text) ||
    /&lt;\/?(?:p|h[1-6]|div|span|ul|ol|li|blockquote|a|strong|b|em|i|u|s|del|table|thead|tbody|tr|td|th|pre|code|img|br|hr)\b/i.test(text)
  )
}

/**
 * Cleans rich text output into direct semantic HTML:
 * - Decodes entity-escaped HTML tags
 * - Strips dark-mode inline styles and font-size overrides on spans
 * - Unwraps styled spans inside headings
 * - Removes empty paragraphs and excess br tags
 * - Fixes nested li > p structure
 */
export function cleanHtmlOutput(html = '') {
  if (!html) return ''
  return html
    // 1. Decode entities if entire tags were escaped
    .replace(/&lt;(\/?(?:p|h[1-6]|div|span|ul|ol|li|blockquote|a|strong|b|em|i|u|s|del|table|thead|tbody|tr|td|th|pre|code|img|br|hr)\b[^&]*)&gt;/gi, '<$1>')
    // 2. Remove unwanted Chrome-injected inline span styles from contentEditable
    .replace(/<span\s+style="[^"]*font-size:\s*15px;?[^"]*">(.*?)<\/span>/gi, '$1')
    .replace(/<span\s+style="[^"]*color:\s*rgba\(255,\s*255,\s*255[^"]*">(.*?)<\/span>/gi, '$1')
    // 3. Remove any spans inside headings (h1-h6) that only hold styling
    .replace(/<(h[1-6])>\s*<span[^>]*>(.*?)<\/span>\s*<\/\1>/gi, '<$1>$2</$1>')
    // 4. Remove empty paragraphs and empty tags
    .replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '')
    // 5. Fix nested li > p
    .replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gi, '<li>$1</li>')
    // 6. Clean loose data attributes
    .replace(/\sdata-[^=]+="[^"]*"/g, '')
    .trim()
}

export function sanitizeHtml(html = '') {
  if (!html) return ''
  const cleaned = cleanHtmlOutput(html)
  return cleaned
    // Remove scripts and object/embed/iframe tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    // Remove inline event handlers
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^>\s]+/gi, '')
    // Disarm javascript: URLs
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"')
    // Ensure all links open in a new tab safely if target is not specified
    .replace(/<a\b(?![^>]*\btarget=)([^>]+)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>')
    // Ensure existing target="_blank" has rel="noopener noreferrer"
    .replace(/<a\b([^>]*\btarget=(['"])_blank\2)(?![^>]*\brel=)([^>]+)>/gi, '<a $1 rel="noopener noreferrer" $3>')
    // Normalize image URLs
    .replace(/<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi, (_, before, q, src, after) => {
      return `<img ${before}src=${q}${normalizeMediaUrl(src)}${q}${after}>`
    })
}

export function renderMarkdown(markdown = '') {
  if (!markdown) return ''

  // If content is already HTML, sanitize and return directly
  if (isHtml(markdown)) {
    return sanitizeHtml(markdown)
  }

  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (```lang ... ```)
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gm, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
  })

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Images: ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => `<img src="${normalizeMediaUrl(url)}" alt="${alt}" loading="lazy" />`
  )

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Headings (#, ##, ###)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Blockquotes (> text)
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // Unordered lists (- item or * item)
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>')
  // Group list items
  html = html.replace(/(<li>.*<\/li>)/gims, (match) => `<ul>${match}</ul>`)

  // Paragraphs (double newlines)
  const blocks = html.split(/\n\s*\n/)
  html = blocks.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    if (/^<(h[1-6]|ul|ol|pre|blockquote)/i.test(trimmed)) {
      return trimmed
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')

  return html
}

// Utility to generate URL-friendly slug
export function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w-]+/g, '')     // Remove non-word chars except hyphen
    .replace(/--+/g, '-')        // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
    .slice(0, 100)
}

// Format readable dates
export function formatDate(dateString) {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

// Format relative or full datetime
export function formatDateTime(dateString) {
  if (!dateString) return ''
  try {
    const d = new Date(dateString)
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}
