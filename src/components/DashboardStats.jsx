import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import {
  CheckCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons'

export function DashboardStats({ counts, activeFilter, onSelectFilter }) {
  const items = [
    {
      id: 'PUBLISHED',
      title: 'Published',
      value: counts.published || 0,
      prefix: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      valueStyle: { color: '#52c41a' }
    },
    {
      id: 'DRAFT',
      title: 'Drafts',
      value: counts.drafts || 0,
      prefix: <FileTextOutlined style={{ color: '#1677ff' }} />,
      valueStyle: { color: '#1677ff' }
    },
    {
      id: 'SCHEDULED',
      title: 'Scheduled',
      value: counts.scheduled || 0,
      prefix: <ClockCircleOutlined style={{ color: '#faad14' }} />,
      valueStyle: { color: '#faad14' }
    },
    {
      id: 'all',
      title: 'Total Updates',
      value: counts.total || 0,
      prefix: <AppstoreOutlined style={{ color: '#722ed1' }} />,
      valueStyle: { color: '#d3adf7' }
    }
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {items.map((item) => {
        const isSelected = activeFilter === item.id
        return (
          <Col xs={24} sm={12} md={6} key={item.id}>
            <Card
              hoverable
              onClick={() => onSelectFilter(item.id)}
              style={{
                borderColor: isSelected ? '#1677ff' : undefined,
                cursor: 'pointer'
              }}
            >
              <Statistic
                title={item.title}
                value={item.value}
                prefix={item.prefix}
                valueStyle={item.valueStyle}
              />
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}
