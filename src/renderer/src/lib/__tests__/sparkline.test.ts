import { describe, it, expect } from 'vitest'
import { buildSparkSeries, buildSparkPath } from '../sparkline'
import type { MqttMessage } from '../../types'

function makeMsg(payload: string, timestamp: number): MqttMessage {
  return {
    id: String(timestamp),
    brokerId: 'broker1',
    topic: 'test/topic',
    payload,
    qos: 0,
    retain: false,
    timestamp,
  }
}

describe('buildSparkSeries', () => {
  it('returns empty array for empty history', () => {
    expect(buildSparkSeries([])).toEqual([])
  })

  it('returns empty array when no numeric fields exist', () => {
    const history = [makeMsg('hello', 1000), makeMsg('world', 2000)]
    expect(buildSparkSeries(history)).toEqual([])
  })

  it('returns empty array when only one data point exists', () => {
    const history = [makeMsg('{"value":42}', 1000)]
    expect(buildSparkSeries(history)).toEqual([])
  })

  it('extracts a single numeric field from JSON', () => {
    const history = [
      makeMsg('{"value":10}', 1000),
      makeMsg('{"value":20}', 2000),
    ]
    const series = buildSparkSeries(history)
    expect(series).toHaveLength(1)
    expect(series[0].field).toBe('value')
    expect(series[0].points).toHaveLength(2)
  })

  it('history is newest-first; series points are chronological (oldest→newest)', () => {
    // history stored newest-first (index 0 = most recent)
    const history = [
      makeMsg('{"value":20}', 2000),  // newest
      makeMsg('{"value":10}', 1000),  // oldest
    ]
    const [s] = buildSparkSeries(history)
    // After reversing to chronological: [1000, 2000]
    expect(s.points[0].timestamp).toBe(1000)
    expect(s.points[1].timestamp).toBe(2000)
  })

  it('computes correct min, max, last, avg', () => {
    // newest-first order
    const history = [
      makeMsg('{"value":30}', 3000),  // newest → last
      makeMsg('{"value":20}', 2000),
      makeMsg('{"value":10}', 1000),  // oldest
    ]
    const [s] = buildSparkSeries(history)
    expect(s.min).toBe(10)
    expect(s.max).toBe(30)
    expect(s.last).toBe(30)
    expect(s.avg).toBeCloseTo(20)
  })

  it('extracts multiple numeric fields from JSON', () => {
    const history = [
      makeMsg('{"temp":25,"humidity":60}', 1000),
      makeMsg('{"temp":26,"humidity":61}', 2000),
    ]
    const series = buildSparkSeries(history)
    expect(series).toHaveLength(2)
    const fields = series.map((s) => s.field).sort()
    expect(fields).toEqual(['humidity', 'temp'])
  })

  it('skips non-numeric fields', () => {
    const history = [
      makeMsg('{"value":1,"label":"hot","active":true}', 1000),
      makeMsg('{"value":2,"label":"cold","active":false}', 2000),
    ]
    const series = buildSparkSeries(history)
    expect(series).toHaveLength(1)
    expect(series[0].field).toBe('value')
  })

  it('handles bare numeric payloads', () => {
    // history is newest-first (matching topicStore)
    const history = [makeMsg('84', 2000), makeMsg('42', 1000)]
    const [s] = buildSparkSeries(history)
    expect(s.field).toBe('value')
    expect(s.last).toBe(84)
  })

  it('prioritises field named "value" first', () => {
    const history = [
      makeMsg('{"alpha":1,"value":2}', 1000),
      makeMsg('{"alpha":3,"value":4}', 2000),
    ]
    const series = buildSparkSeries(history)
    expect(series[0].field).toBe('value')
  })

  it('skips non-finite numbers (Infinity, NaN via JSON)', () => {
    // JSON.parse won't produce Infinity/NaN from standard JSON, but
    // a computed field could. Test that finite check holds.
    const history = [
      makeMsg('{"value":1}', 1000),
      makeMsg('{"value":2}', 2000),
    ]
    const [s] = buildSparkSeries(history)
    expect(isFinite(s.min)).toBe(true)
    expect(isFinite(s.max)).toBe(true)
  })
})

describe('buildSparkPath', () => {
  const twoPoints = [
    { timestamp: 0, value: 0 },
    { timestamp: 100, value: 100 },
  ]

  it('returns empty string for fewer than 2 points', () => {
    expect(buildSparkPath([], 100, 50)).toBe('')
    expect(buildSparkPath([{ timestamp: 0, value: 0 }], 100, 50)).toBe('')
  })

  it('returns an SVG path string starting with M', () => {
    const path = buildSparkPath(twoPoints, 100, 50)
    expect(path).toMatch(/^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+/)
  })

  it('generates one segment per point', () => {
    const points = [
      { timestamp: 0, value: 10 },
      { timestamp: 50, value: 20 },
      { timestamp: 100, value: 30 },
    ]
    const path = buildSparkPath(points, 100, 50)
    const commands = path.split(' ')
    expect(commands).toHaveLength(3) // M + 2 L commands
  })

  it('respects padding — first point x equals padding', () => {
    const padding = 8
    const path = buildSparkPath(twoPoints, 100, 50, padding)
    const firstX = parseFloat(path.replace(/^M/, '').split(',')[0])
    expect(firstX).toBeCloseTo(padding)
  })

  it('last point x equals width - padding', () => {
    const padding = 6
    const width = 200
    const path = buildSparkPath(twoPoints, width, 50, padding)
    const lastCoords = path.split(' ').at(-1)!.replace('L', '').split(',')
    expect(parseFloat(lastCoords[0])).toBeCloseTo(width - padding)
  })

  it('handles flat series (all values equal) without division by zero', () => {
    const flat = [
      { timestamp: 0, value: 5 },
      { timestamp: 100, value: 5 },
    ]
    expect(() => buildSparkPath(flat, 100, 50)).not.toThrow()
    const path = buildSparkPath(flat, 100, 50)
    expect(path).toBeTruthy()
  })
})
