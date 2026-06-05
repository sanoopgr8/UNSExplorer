import { useMemo, useState } from 'react'
import { buildSparkSeries, buildSparkPath } from '../lib/sparkline'
import type { MqttMessage } from '../types'

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(2)}k`
  if (Number.isInteger(v)) return String(v)
  return v.toPrecision(5).replace(/\.?0+$/, '')
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  return `${Math.round(diff / 3_600_000)}h ago`
}

interface MiniSparklineProps {
  history: MqttMessage[]
  width?: number
  height?: number
  color?: string
}

export function MiniSparkline({ history, width = 60, height = 20, color = '#3b82f6' }: MiniSparklineProps) {
  const series = useMemo(() => buildSparkSeries(history), [history])
  const primary = series[0]
  if (!primary) return null
  const path = buildSparkPath(primary.points, width, height)
  if (!path) return null

  return (
    <svg width={width} height={height} className="flex-shrink-0 opacity-70">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface SparklineTabProps {
  history: MqttMessage[]
}

export function SparklineTab({ history }: SparklineTabProps) {
  const series = useMemo(() => buildSparkSeries(history), [history])
  const [selectedField, setSelectedField] = useState<string | null>(null)

  if (series.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
        <div className="text-4xl mb-3 opacity-10">📈</div>
        <p className="text-sm text-gray-500">No numeric values to chart.</p>
        <p className="text-xs text-gray-600 mt-1">Sparklines appear for JSON payloads with numeric fields.</p>
      </div>
    )
  }

  const active = series.find((s) => s.field === selectedField) ?? series[0]
  const W = 480
  const H = 120

  const path = buildSparkPath(active.points, W, H, 6)

  // Reference line at avg
  const avgFrac = active.max === active.min ? 0.5 : (active.avg - active.min) / (active.max - active.min)
  const avgY = (6 + (1 - avgFrac) * (H - 12)).toFixed(1)

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Field selector */}
      {series.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {series.map((s) => (
            <button
              key={s.field}
              onClick={() => setSelectedField(s.field)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                s.field === active.field
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {s.field}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Last', value: formatValue(active.last) },
          { label: 'Min', value: formatValue(active.min) },
          { label: 'Max', value: formatValue(active.max) },
          { label: 'Avg', value: formatValue(active.avg) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800/60 rounded p-2 text-center">
            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
            <div className="text-sm font-mono text-gray-100 truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900/60 rounded border border-gray-800 p-2">
        <div className="text-xs text-gray-500 mb-2 font-mono">{active.field}</div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((frac) => {
            const y = (6 + frac * (H - 12)).toFixed(1)
            return <line key={frac} x1="6" x2={W - 6} y1={y} y2={y} stroke="#374151" strokeWidth="0.5" />
          })}

          {/* Avg reference line */}
          <line
            x1="6" x2={W - 6}
            y1={avgY} y2={avgY}
            stroke="#6b7280" strokeWidth="0.8" strokeDasharray="3,3"
          />

          {/* Area fill */}
          {path && (
            <path
              d={`${path} L${(W - 6).toFixed(1)},${H - 6} L6,${H - 6} Z`}
              fill="url(#sparkFill)"
              opacity="0.15"
            />
          )}

          {/* Gradient */}
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Sparkline */}
          {path && (
            <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Last point dot */}
          {active.points.length > 0 && (() => {
            const last = active.points[active.points.length - 1]
            const lPath = buildSparkPath(active.points, W, H, 6)
            if (!lPath) return null
            const minV = active.min
            const maxV = active.max
            const rangeV = maxV - minV || 1
            const minT = active.points[0].timestamp
            const maxT = last.timestamp
            const rangeT = maxT - minT || 1
            const cx = (6 + ((last.timestamp - minT) / rangeT) * (W - 12)).toFixed(1)
            const cy = (H - 6 - ((last.value - minV) / rangeV) * (H - 12)).toFixed(1)
            return <circle cx={cx} cy={cy} r="3" fill="#3b82f6" />
          })()}

          {/* Y-axis labels */}
          <text x="8" y="14" fill="#6b7280" fontSize="9" fontFamily="monospace">{formatValue(active.max)}</text>
          <text x="8" y={H - 4} fill="#6b7280" fontSize="9" fontFamily="monospace">{formatValue(active.min)}</text>
        </svg>

        {/* X-axis time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-600 font-mono">
            {active.points.length > 0 ? formatRelativeTime(active.points[0].timestamp) : ''}
          </span>
          <span className="text-xs text-gray-600 font-mono">
            {active.points.length > 0
              ? formatRelativeTime(active.points[active.points.length - 1].timestamp)
              : ''}
          </span>
        </div>
      </div>

      {/* Sample count */}
      <p className="text-xs text-gray-600 text-center">
        {active.points.length} data point{active.points.length !== 1 ? 's' : ''}
        {history.length > active.points.length ? ` · ${history.length - active.points.length} non-numeric skipped` : ''}
      </p>
    </div>
  )
}
