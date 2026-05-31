import type { DecodedPayload } from '../types'

export function decodePayload(raw: string): DecodedPayload {
  if (!raw || raw.trim() === '') return { type: 'empty', raw, formatted: '(empty)' }

  // Try JSON
  try {
    const parsed = JSON.parse(raw)
    return {
      type: 'json',
      raw,
      parsed,
      formatted: JSON.stringify(parsed, null, 2),
    }
  } catch {
    // not JSON
  }

  // Try detect binary (non-printable chars)
  const hasNonPrintable = /[\x00-\x08\x0e-\x1f\x7f-\xff]/.test(raw)
  if (hasNonPrintable) {
    const hex = Array.from(raw)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(' ')
    return { type: 'binary', raw, formatted: hex }
  }

  return { type: 'text', raw, formatted: raw }
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const hms = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hms}.${ms}`
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 1000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}
