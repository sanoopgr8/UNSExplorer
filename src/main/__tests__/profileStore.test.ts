import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// Mock electron's app module so ProfileStore can be imported in Node
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
  },
}))

// Import AFTER mocking
const { ProfileStore } = await import('../profile-store')

const baseProfile = {
  id: 'p1',
  name: 'Local Broker',
  host: 'localhost',
  port: 1883,
  protocol: 'mqtt' as const,
  clientId: 'test-client',
  color: '#3b82f6',
  subscriptions: ['#'],
}

let store: InstanceType<typeof ProfileStore>
let filePath: string

beforeEach(() => {
  store = new ProfileStore()
  // Derive the file path to clean up
  filePath = path.join(os.tmpdir(), 'broker-profiles.json')
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
})

afterEach(() => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
})

describe('ProfileStore.list', () => {
  it('returns empty array when file does not exist', () => {
    expect(store.list()).toEqual([])
  })

  it('returns empty array when file is corrupted JSON', () => {
    fs.writeFileSync(filePath, 'NOT JSON')
    expect(store.list()).toEqual([])
  })
})

describe('ProfileStore.save', () => {
  it('saves a new profile and returns all profiles', () => {
    const result = store.save(baseProfile)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('persists profile to disk', () => {
    store.save(baseProfile)
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    expect(raw[0].id).toBe('p1')
  })

  it('updates an existing profile in place', () => {
    store.save(baseProfile)
    store.save({ ...baseProfile, name: 'Updated' })
    const profiles = store.list()
    expect(profiles).toHaveLength(1)
    expect(profiles[0].name).toBe('Updated')
  })

  it('appends a new profile when id differs', () => {
    store.save(baseProfile)
    store.save({ ...baseProfile, id: 'p2', name: 'Second' })
    const profiles = store.list()
    expect(profiles).toHaveLength(2)
  })

  it('returns the saved list from save()', () => {
    store.save(baseProfile)
    const result = store.save({ ...baseProfile, id: 'p2' })
    expect(result).toHaveLength(2)
  })
})

describe('ProfileStore.delete', () => {
  it('removes a profile by id and returns remaining profiles', () => {
    store.save(baseProfile)
    store.save({ ...baseProfile, id: 'p2' })
    const result = store.delete('p1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p2')
  })

  it('persists deletion to disk', () => {
    store.save(baseProfile)
    store.delete('p1')
    expect(store.list()).toHaveLength(0)
  })

  it('is a no-op for a non-existent id', () => {
    store.save(baseProfile)
    const result = store.delete('nonexistent')
    expect(result).toHaveLength(1)
  })

  it('handles delete on empty store', () => {
    expect(() => store.delete('p1')).not.toThrow()
  })
})
