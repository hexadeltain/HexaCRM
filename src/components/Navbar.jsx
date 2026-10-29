import React from 'react'
import { Layout, Space, Typography, Tag, Button, Badge, Segmented } from 'antd'
import {
  SettingOutlined,
  PictureOutlined,
  ThunderboltFilled
} from '@ant-design/icons'

const SECTIONS = [
  { value: 'articles', label: 'Updates' },
  { value: 'categories', label: 'Categories' },
  { value: 'widgets', label: 'Widgets' },
  { value: 'analytics', label: 'Analytics' },
]

const { Header } = Layout
const { Title, Text } = Typography

export function Navbar({ section, onSectionChange, onNavigate, apiStatus, onOpenSettings, onOpenMediaLibrary }) {
  return (
    <Header
      className="app-navbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 64,
        lineHeight: 'normal',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'transparent'
      }}
    >
      <div
        className="app-navbar-brand"
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => onNavigate('list')}
      >
        <ThunderboltFilled style={{ fontSize: 26, color: '#1677ff' }} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
              HexaDelta
            </Title>
            <Tag color="blue" style={{ margin: 0 }}>
              CMS
            </Tag>
          </div>
          <Text className="app-navbar-subtitle" type="secondary" style={{ fontSize: 12 }}>
            Content, widgets & analytics
          </Text>
        </div>
      </div>

      <Segmented className="app-navbar-sections" value={section} onChange={onSectionChange} options={SECTIONS} />

      <Space className="app-navbar-actions" size="middle">
        {apiStatus && (
          <Badge
            className="app-navbar-status"
            status={apiStatus.ok ? 'success' : 'error'}
            text={
              <span
                style={{ cursor: 'pointer', fontSize: 13 }}
                onClick={onOpenSettings}
                title={apiStatus.ok ? `Connected to ${apiStatus.url || 'API'}` : apiStatus.error}
              >
                {apiStatus.ok ? 'Backend Live' : 'API Offline'}
              </span>
            }
          />
        )}

        <Button
          className="app-navbar-media-button"
          icon={<PictureOutlined />}
          onClick={onOpenMediaLibrary}
        >
          <span>Media Library</span>
        </Button>

        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={onOpenSettings}
        />
      </Space>
    </Header>
  )
}
