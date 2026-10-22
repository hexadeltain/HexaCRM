// Lightweight, secure Markdown-to-HTML parser (0 dependencies, standard library regex)
import { normalizeMediaUrl } from './media'

export function renderMarkdown(markdown = '') {
  if (!markdown) return ''

  let html = markdown
    // Escape standard HTML tags for safety (except if explicitly entered)
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
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')

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
