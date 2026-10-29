import React, { useEffect, useMemo, useRef, useState } from 'react'

// One series over time. Single-series by design: two measures never share an axis here —
// show them as two charts. Colour validated against the CMS surface (#141414): series #3987e5.
const SERIES = '#3987e5'
const GRID = 'rgba(255,255,255,0.08)'
const AXIS_TEXT = 'rgba(255,255,255,0.45)'
const HEIGHT = 220
const PAD = { top: 12, right: 16, bottom: 26, left: 44 }

const niceMax = (v) => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

const fmtValue = (v, format) => (format ? format(v) : Number(v).toLocaleString('en-IN'))
const fmtLabel = (t) => {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return String(t)
  return /T\d\d:/.test(String(t)) && !/T00:00/.test(String(t))
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * points: [{ t, v }] oldest first. Crosshair + tooltip on hover; the y axis starts at 0.
 */
export function LineChart({ points = [], format, ariaLabel }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const innerW = width - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom
    const max = niceMax(Math.max(0, ...points.map((p) => Number(p.v) || 0)))
    const x = (i) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
    const y = (v) => PAD.top + innerH - (Math.max(0, Number(v) || 0) / max) * innerH
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
    const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 90))))
    return { innerW, innerH, max, x, y, ticks, labelEvery }
  }, [points, width])

  if (points.length === 0) {
    return <div style={{ height: HEIGHT, display: 'grid', placeItems: 'center', color: AXIS_TEXT }}>No data in this range</div>
  }

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${geo.x(i).toFixed(1)},${geo.y(p.v).toFixed(1)}`).join(' ')

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const step = points.length > 1 ? geo.innerW / (points.length - 1) : 1
    const i = Math.round((px - PAD.left) / step)
    setHover(Math.min(points.length - 1, Math.max(0, i)))
  }

  const hp = hover != null ? points[hover] : null
  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block' }}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke={GRID} />
            <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
              {fmtValue(t, format)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % geo.labelEvery === 0 ? (
            <text key={p.t} x={geo.x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
              {fmtLabel(p.t)}
            </text>
          ) : null
        )}
        <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <g pointerEvents="none">
            <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={PAD.top + geo.innerH} stroke="rgba(255,255,255,0.25)" />
            <circle cx={geo.x(hover)} cy={geo.y(hp.v)} r="4.5" fill={SERIES} stroke="#141414" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: Math.min(Math.max(geo.x(hover) - 70, 0), width - 150),
            width: 140,
            padding: '6px 10px',
            borderRadius: 6,
            background: '#1f1f1f',
            border: '1px solid rgba(255,255,255,0.12)',
            pointerEvents: 'none',
            fontSize: 12,
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.55)' }}>{fmtLabel(hp.t)}</div>
          <div style={{ color: '#fff', fontWeight: 600 }}>{fmtValue(hp.v, format)}</div>
        </div>
      )}
    </div>
  )
}
