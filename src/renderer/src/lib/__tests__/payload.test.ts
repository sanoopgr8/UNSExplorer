import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { decodePayload, formatTimestamp, formatRelative } from '../payload'

describe('decodePayload', () => {
  it('returns empty type for blank string', () => {
    expect(decodePayload('').type).toBe('empty')
    expect(decodePayload('   ').type).toBe('empty')
  })

  it('returns empty formatted label for empty payload', () => {
    expect(decodePayload('').formatted).toBe('(empty)')
  })

  it('decodes valid JSON object', () => {
    const result = decodePayload('{"value":42,"unit":"C"}')
    expect(result.type).toBe('json')
    expect(result.parsed).toEqual({ value: 42, unit: 'C' })
    expect(result.formatted).toContain('"value": 42')
  })

  it('decodes valid JSON array', () => {
    const result = decodePayload('[1,2,3]')
    expect(result.type).toBe('json')
    expect(result.parsed).toEqual([1, 2, 3])
  })

  it('decodes JSON number', () => {
    const result = decodePayload('3.14')
    expect(result.type).toBe('json')
    expect(result.parsed).toBe(3.14)
  })

  it('decodes JSON boolean', () => {
    expect(decodePayload('true').type).toBe('json')
    expect(decodePayload('false').parsed).toBe(false)
  })

  it('decodes JSON null', () => {
    const result = decodePayload('null')
    expect(result.type).toBe('json')
    expect(result.parsed).toBeNull()
  })

  it('preserves raw string for JSON payloads', () => {
    const raw = '{"a":1}'
    expect(decodePayload(raw).raw).toBe(raw)
  })

  it('returns text type for plain strings', () => {
    const result = decodePayload('hello world')
    expect(result.type).toBe('text')
    expect(result.formatted).toBe('hello world')
  })

  it('returns binary type for payloads with non-printable chars', () => {
    const result = decodePayload('hello\x01world')
    expect(result.type).toBe('binary')
    expect(result.formatted).toMatch(/^[0-9a-f]{2}( [0-9a-f]{2})*$/)
  })

  it('formats binary as space-separated hex', () => {
    const result = decodePayload('\x00\xff')
    expect(result.formatted).toBe('00 ff')
  })

  it('handles malformed JSON as text', () => {
    const result = decodePayload('{bad json}')
    expect(result.type).toBe('text')
  })
})

describe('formatTimestamp', () => {
  it('returns HH:MM:SS.mmm format', () => {
    // Use a fixed known timestamp: 2024-01-15 10:30:45.123 UTC
    // We test format shape rather than exact value since locale may vary
    const ts = new Date('2024-01-15T10:30:45.123Z').getTime()
    const result = formatTimestamp(ts)
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)
  })

  it('zero-pads milliseconds', () => {
    // Find a timestamp where ms < 10 to verify padding
    const d = new Date()
    d.setMilliseconds(5)
    const result = formatTimestamp(d.getTime())
    expect(result).toMatch(/\.\d{3}$/)
  })
})

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for timestamps within 1 second', () => {
    expect(formatRelative(Date.now() - 500)).toBe('just now')
    expect(formatRelative(Date.now())).toBe('just now')
  })

  it('returns seconds ago for timestamps within 1 minute', () => {
    expect(formatRelative(Date.now() - 30_000)).toBe('30s ago')
    expect(formatRelative(Date.now() - 59_000)).toBe('59s ago')
  })

  it('returns minutes ago for timestamps within 1 hour', () => {
    expect(formatRelative(Date.now() - 120_000)).toBe('2m ago')
    expect(formatRelative(Date.now() - 3_540_000)).toBe('59m ago')
  })

  it('returns hours ago for older timestamps', () => {
    expect(formatRelative(Date.now() - 7_200_000)).toBe('2h ago')
  })
})
