import type { MqttMessage } from '../types'

export interface SparkPoint {
  timestamp: number
  value: number
}

export interface SparkSeries {
  field: string
  points: SparkPoint[]
  min: number
  max: number
  last: number
  avg: number
}

function extractNumericFields(payload: string): Record<string, number> {
  try {
    const parsed = JSON.parse(payload)
    if (typeof parsed === 'number') return { value: parsed }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const result: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && isFinite(v)) result[k] = v
    }
    return result
  } catch {
    const n = Number(payload.trim())
    if (isFinite(n)) return { value: n }
    return {}
  }
}

export function buildSparkSeries(history: MqttMessage[]): SparkSeries[] {
  // history is newest-first; reverse for chronological order
  const chronological = [...history].reverse()

  // Collect all numeric fields across messages
  const fieldPoints = new Map<string, SparkPoint[]>()

  for (const msg of chronological) {
    const fields = extractNumericFields(msg.payload)
    for (const [field, value] of Object.entries(fields)) {
      if (!fieldPoints.has(field)) fieldPoints.set(field, [])
      fieldPoints.get(field)!.push({ timestamp: msg.timestamp, value })
    }
  }

  const series: SparkSeries[] = []
  for (const [field, points] of fieldPoints) {
    if (points.length < 2) continue
    const values = points.map((p) => p.value)
    series.push({
      field,
      points,
      min: Math.min(...values),
      max: Math.max(...values),
      last: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    })
  }

  // Sort: field named "value" first, then alphabetically
  return series.sort((a, b) => {
    if (a.field === 'value') return -1
    if (b.field === 'value') return 1
    return a.field.localeCompare(b.field)
  })
}

export function buildSparkPath(points: SparkPoint[], width: number, height: number, padding = 4): string {
  if (points.length < 2) return ''
  const values = points.map((p) => p.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const rangeV = maxV - minV || 1
  const minT = points[0].timestamp
  const maxT = points[points.length - 1].timestamp
  const rangeT = maxT - minT || 1

  const toX = (t: number) => padding + ((t - minT) / rangeT) * (width - padding * 2)
  const toY = (v: number) => height - padding - ((v - minV) / rangeV) * (height - padding * 2)

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.timestamp).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(' ')
  return d
}
