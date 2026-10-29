import React, { useState, useEffect, useCallback } from 'react'
import { ConfigProvider, Layout, theme, message } from 'antd'
import { Navbar } from './components/Navbar'
import { DashboardStats } from './components/DashboardStats'
import { ArticleList } from './components/ArticleList'
import { ArticleEditor } from './components/ArticleEditor'
import { ArticlePreviewModal } from './components/ArticlePreviewModal'
import { MediaUploadModal } from './components/MediaUploadModal'
import { SettingsModal } from './components/SettingsModal'
import { CategoriesPage } from './components/CategoriesPage'
import { WidgetsPage } from './components/widgets/WidgetsPage'
import { AnalyticsPage } from './components/analytics/AnalyticsPage'
import {
  fetchArticles,
  fetchArticle,
  createArticle,
  updateArticle,
  publishArticle,
  testConnection,
  getApiConfig
} from './api'

const { Content } = Layout

export default function App() {
  const [section, setSection] = useState('articles') // 'articles' | 'categories' | 'widgets' | 'analytics'
  const [currentView, setCurrentView] = useState('list') // 'list' | 'create' | 'edit' (articles section)
  // "Add widget" on an article: open the Widgets section with a new widget linked to it.
  const [widgetForArticleId, setWidgetForArticleId] = useState(null)
  const handleAddWidget = useCallback((articleId) => {
    setWidgetForArticleId(articleId)
    setSection('widgets')
  }, [])
  const clearWidgetPreset = useCallback(() => setWidgetForArticleId(null), [])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeArticle, setActiveArticle] = useState(null)
  const [previewArticle, setPreviewArticle] = useState(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Modals & Status
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState(null)

  // Load Articles & Test Connectivity
  const loadArticles = useCallback(async () => {
    setLoading(true)
    try {
      const conn = await testConnection()
      const { apiUrl } = getApiConfig()
      setApiStatus({
        ok: conn.ok,
        ping: conn.ping,
        url: apiUrl || 'Proxy (/api)',
        error: conn.error
      })

      const data = await fetchArticles({
        limit: 50,
        status: 'all'
      })

      setArticles(data.items || [])
    } catch (err) {
      console.error('Failed to load articles:', err)
      setApiStatus({ ok: false, error: err.message })
      message.error(`Failed to load articles: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  // Compute Article Counts for Top Stats
  const counts = React.useMemo(() => {
    const now = new Date()
    let published = 0
    let scheduled = 0
    let drafts = 0
    let archived = 0

    articles.forEach((a) => {
      if (a.status === 'PUBLISHED') {
        const isFuture = a.published_at && new Date(a.published_at) > now
        if (isFuture) {
          scheduled++
        } else {
          published++
        }
      } else if (a.status === 'DRAFT') {
        drafts++
      } else if (a.status === 'ARCHIVED') {
        archived++
      }
    })

    return {
      published,
      scheduled,
      drafts,
      archived,
      total: articles.length
    }
  }, [articles])

  // Filtered Articles based on Search & Tabs
  const filteredArticles = React.useMemo(() => {
    const now = new Date()
    return articles.filter((a) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = a.title?.toLowerCase().includes(q)
        const matchesSummary = a.summary?.toLowerCase().includes(q)
        const matchesTags = a.tags?.some((t) => t.toLowerCase().includes(q))
        if (!matchesTitle && !matchesSummary && !matchesTags) {
          return false
        }
      }

      // 2. Category Filter
      if (categoryFilter && a.category !== categoryFilter) {
        return false
      }

      // 3. Status Tab Filter
      if (statusFilter === 'all') return true
      if (statusFilter === 'DRAFT') return a.status === 'DRAFT'
      if (statusFilter === 'ARCHIVED') return a.status === 'ARCHIVED'
      if (statusFilter === 'PUBLISHED') {
        return a.status === 'PUBLISHED' && (!a.published_at || new Date(a.published_at) <= now)
      }
      if (statusFilter === 'SCHEDULED') {
        return a.status === 'PUBLISHED' && a.published_at && new Date(a.published_at) > now
      }

      return true
    })
  }, [articles, searchQuery, categoryFilter, statusFilter])

  // Navigation Handlers
  const handleNewArticle = () => {
    setActiveArticle(null)
    setCurrentView('create')
  }

  const handleEditArticle = async (id) => {
    try {
      const article = await fetchArticle(id, true)
      setActiveArticle(article)
      setCurrentView('edit')
    } catch (err) {
      message.error(`Error opening article: ${err.message}`)
    }
  }

  const handlePreviewArticle = async (id) => {
    try {
      const article = await fetchArticle(id, true)
      setPreviewArticle(article)
    } catch (err) {
      message.error(`Error previewing article: ${err.message}`)
    }
  }

  // Action: Save as Draft
  const handleSaveDraft = async (payload) => {
    setSaving(true)
    try {
      if (currentView === 'create') {
        await createArticle(payload)
        message.success(`Draft "${payload.title}" created`)
      } else {
        await updateArticle(activeArticle.id, { ...payload, status: 'DRAFT' })
        message.success(`Draft "${payload.title}" updated`)
      }
      await loadArticles()
      setCurrentView('list')
    } catch (err) {
      message.error(`Failed to save draft: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Action: Publish Immediately
  const handlePublishNow = async (payload) => {
    setSaving(true)
    try {
      let articleId = activeArticle?.id
      if (currentView === 'create') {
        const createRes = await createArticle(payload)
        articleId = createRes.id
      } else {
        await updateArticle(articleId, payload)
      }

      await publishArticle(articleId, null)
      message.success(`Article "${payload.title}" published live!`)
      await loadArticles()
      setCurrentView('list')
    } catch (err) {
      message.error(`Failed to publish: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Action: Schedule for Later
  const handleSchedule = async (payload, isoDateTime) => {
    setSaving(true)
    try {
      let articleId = activeArticle?.id
      if (currentView === 'create') {
        const createRes = await createArticle(payload)
        articleId = createRes.id
      } else {
        await updateArticle(articleId, payload)
      }

      await publishArticle(articleId, isoDateTime)
      message.success(`Article scheduled for release`)
      await loadArticles()
      setCurrentView('list')
    } catch (err) {
      message.error(`Failed to schedule article: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Action: Archive
  const handleArchiveArticle = async (id) => {
    try {
      await updateArticle(id, { status: 'ARCHIVED' })
      message.info('Article archived from public feed')
      await loadArticles()
      if (currentView === 'edit') {
        setCurrentView('list')
      }
    } catch (err) {
      message.error(`Failed to archive article: ${err.message}`)
    }
  }

  // Action: Quick Publish from list
  const handleQuickPublish = async (id) => {
    try {
      await publishArticle(id, null)
      message.success('Article published live!')
      await loadArticles()
    } catch (err) {
      message.error(`Publish failed: ${err.message}`)
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Navbar
          section={section}
          onSectionChange={setSection}
          onNavigate={(view) => {
            setSection('articles')
            setCurrentView(view)
          }}
          apiStatus={apiStatus}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenMediaLibrary={() => setIsMediaModalOpen(true)}
        />

        <Content
          className="app-content"
        >
          {section === 'categories' && <CategoriesPage />}
          {section === 'widgets' && (
            <WidgetsPage presetArticleId={widgetForArticleId} onPresetConsumed={clearWidgetPreset} />
          )}
          {section === 'analytics' && <AnalyticsPage />}

          {section === 'articles' && currentView === 'list' && (
            <>
              <DashboardStats
                counts={counts}
                activeFilter={statusFilter}
                onSelectFilter={(filterId) => setStatusFilter(filterId)}
              />

              <ArticleList
                articles={filteredArticles}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                onNewArticle={handleNewArticle}
                onEditArticle={handleEditArticle}
                onPreviewArticle={handlePreviewArticle}
                onQuickPublish={handleQuickPublish}
                onArchiveArticle={handleArchiveArticle}
                onAddWidget={handleAddWidget}
                onRefresh={loadArticles}
              />
            </>
          )}

          {section === 'articles' && (currentView === 'create' || currentView === 'edit') && (
            <ArticleEditor
              isNew={currentView === 'create'}
              article={activeArticle}
              saving={saving}
              onSaveDraft={handleSaveDraft}
              onPublishNow={handlePublishNow}
              onSchedule={handleSchedule}
              onArchive={handleArchiveArticle}
              onCancel={() => setCurrentView('list')}
              onPreview={(art) => setPreviewArticle(art)}
            />
          )}
        </Content>

        {previewArticle && (
          <ArticlePreviewModal
            article={previewArticle}
            onClose={() => setPreviewArticle(null)}
          />
        )}

        <MediaUploadModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onConfigSaved={() => loadArticles()}
        />
      </Layout>
    </ConfigProvider>
  )
}
