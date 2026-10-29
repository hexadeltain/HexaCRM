import React, { useState } from 'react'
import { Alert, Button, Card, Radio, Space, Typography, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { downloadAnalyticsExport } from '../../api'

const { Text } = Typography
const MAX_DAYS = 31

/** Raw events or sessions for the selected range as CSV / NDJSON (max 31 days, audit-logged). */
export function ExportTab({ filters }) {
  const [type, setType] = useState('events')
  const [format, setFormat] = useState('csv')
  const [loading, setLoading] = useState(false)
  const days = dayjs(filters.to).diff(dayjs(filters.from), 'day') + 1
  const tooLong = days > MAX_DAYS

  const download = async () => {
    setLoading(true)
    try {
      await downloadAnalyticsExport({ ...filters, type, format })
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card size="small" title="Export raw data">
      <Space direction="vertical" size="middle">
        <Text type="secondary">
          Uses the date range and platform above ({filters.from} to {filters.to}, {days} day{days === 1 ? '' : 's'}).
        </Text>
        <Radio.Group value={type} onChange={(e) => setType(e.target.value)} optionType="button" options={[
          { value: 'events', label: 'Events' },
          { value: 'sessions', label: 'Sessions' },
        ]} />
        <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)} options={[
          { value: 'csv', label: 'CSV (spreadsheets)' },
          { value: 'ndjson', label: 'NDJSON (one JSON per line)' },
        ]} />
        {tooLong && <Alert type="warning" showIcon message={`Exports cover at most ${MAX_DAYS} days — shorten the range.`} />}
        <Button type="primary" icon={<DownloadOutlined />} loading={loading} disabled={tooLong} onClick={download}>
          Download
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Contains personal activity; every export is recorded in the audit log.
        </Text>
      </Space>
    </Card>
  )
}
