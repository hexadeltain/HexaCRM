import React, { useState } from 'react'
import { Modal, Form, Input, Button, Alert, Space, Typography, message } from 'antd'
import { ApiOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { getApiConfig, saveApiConfig, testConnection } from '../api'

const { Paragraph, Text } = Typography

export function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const current = getApiConfig()
  const [apiUrl, setApiUrl] = useState(current.apiUrl)
  const [adminKey, setAdminKey] = useState(current.adminKey)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  if (!isOpen) return null

  const handleSave = () => {
    saveApiConfig({ apiUrl, adminKey })
    message.success('API configuration saved')
    onConfigSaved()
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    saveApiConfig({ apiUrl, adminKey })
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)
    if (result.ok) {
      message.success(`Connected to API (${result.ping}ms)`)
    } else {
      message.error(`Connection failed: ${result.error}`)
    }
  }

  return (
    <Modal
      title="Admin API Settings"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="test" loading={testing} onClick={handleTest} icon={<ApiOutlined />}>
          Test Connection
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save Settings
        </Button>
      ]}
    >
      <Form layout="vertical">
        <Form.Item
          label="Backend API Base URL"
          extra="Leave empty to use local Vite dev server proxy (/api)"
        >
          <Input
            placeholder="e.g. http://192.168.1.159:4100"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
        </Form.Item>

        <Form.Item
          label="Admin Key (X-Admin-Key header)"
          extra="Required for write requests if ARTICLE_ADMIN_KEY is enabled on backend"
        >
          <Input.Password
            placeholder="Enter admin secret key (or leave blank if open)"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
        </Form.Item>

        {testResult && (
          <Alert
            style={{ marginTop: 16 }}
            type={testResult.ok ? 'success' : 'error'}
            message={
              testResult.ok
                ? `Connected to backend successfully in ${testResult.ping}ms`
                : `Error: ${testResult.error}`
            }
            showIcon
          />
        )}
      </Form>
    </Modal>
  )
}
