import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MqttManager } from '../mqtt-manager'
import type { BrokerProfile } from '../mqtt-manager'

// Mock the mqtt module
vi.mock('mqtt', () => {
  const mockClient = {
    connected: false,
    on: vi.fn(),
    end: vi.fn((_force: boolean, _opts: object, cb?: () => void) => cb?.()),
    publish: vi.fn((_t: string, _p: string, _opts: object, cb?: (err?: Error) => void) => cb?.()),
    subscribe: vi.fn((_filters: string[], _opts: object, cb?: (err: Error | null, granted: unknown[]) => void) => cb?.(null, [])),
    unsubscribe: vi.fn((_topics: string[], _opts: object, cb?: () => void) => cb?.()),
  }
  return {
    connect: vi.fn(() => mockClient),
    __mockClient: mockClient,
  }
})

vi.mock('net', () => ({
  Socket: vi.fn(() => ({
    setTimeout: vi.fn(),
    once: vi.fn(),
    connect: vi.fn(),
    destroy: vi.fn(),
  })),
}))

const baseProfile: BrokerProfile = {
  id: 'broker1',
  name: 'Test',
  host: 'localhost',
  port: 1883,
  protocol: 'ws',  // ws skips TCP pre-check
  clientId: 'test',
  color: '#000',
  subscriptions: ['#'],
}

const noopEmit = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MqttManager.allStatus', () => {
  it('returns empty object when no connections', () => {
    const manager = new MqttManager()
    expect(manager.allStatus()).toEqual({})
  })
})

describe('MqttManager.disconnect', () => {
  it('is a no-op when brokerId is not connected', async () => {
    const manager = new MqttManager()
    await expect(manager.disconnect('unknown')).resolves.toBeUndefined()
  })
})

describe('MqttManager.publish', () => {
  it('returns error when not connected', async () => {
    const manager = new MqttManager()
    const result = await manager.publish('broker1', 'topic', 'payload')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not connected/i)
  })
})

describe('MqttManager.updateSubscriptions', () => {
  it('returns error when not connected', async () => {
    const manager = new MqttManager()
    const result = await manager.updateSubscriptions('broker1', ['new/#'], [], noopEmit)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not connected/i)
  })
})

describe('MqttManager.connect (WS — no TCP pre-check)', () => {
  it('calls mqtt.connect with correct URL', async () => {
    const mqtt = await import('mqtt')
    const mockClient = (mqtt as unknown as { __mockClient: typeof mqtt }).connect() as ReturnType<typeof mqtt.connect> & { on: ReturnType<typeof vi.fn> }

    // Simulate immediate 'connect' event
    mockClient.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'connect') setTimeout(cb, 0)
    })

    const manager = new MqttManager()
    const connectPromise = manager.connect(baseProfile, noopEmit)

    await connectPromise

    expect(mqtt.connect).toHaveBeenCalledWith(
      'ws://localhost:1883',
      expect.objectContaining({ clientId: 'test' }),
    )
  })

  it('emits broker:connected on successful connect', async () => {
    const mqtt = await import('mqtt')
    const mockClient = (mqtt as unknown as { __mockClient: typeof mqtt }).connect() as ReturnType<typeof mqtt.connect> & { on: ReturnType<typeof vi.fn> }

    mockClient.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'connect') setTimeout(cb, 0)
    })

    const emit = vi.fn()
    const manager = new MqttManager()
    await manager.connect(baseProfile, emit)

    expect(emit).toHaveBeenCalledWith('broker:connected', { brokerId: 'broker1' })
  })

  it('returns ok:true on successful connect', async () => {
    const mqtt = await import('mqtt')
    const mockClient = (mqtt as unknown as { __mockClient: typeof mqtt }).connect() as ReturnType<typeof mqtt.connect> & { on: ReturnType<typeof vi.fn> }

    mockClient.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'connect') setTimeout(cb, 0)
    })

    const manager = new MqttManager()
    const result = await manager.connect(baseProfile, noopEmit)
    expect(result.ok).toBe(true)
  })

  it('returns ok:false on mqtt error before connect', async () => {
    const mqtt = await import('mqtt')
    const mockClient = (mqtt as unknown as { __mockClient: typeof mqtt }).connect() as ReturnType<typeof mqtt.connect> & { on: ReturnType<typeof vi.fn> }

    mockClient.on.mockImplementation((event: string, cb: (err?: Error) => void) => {
      if (event === 'error') setTimeout(() => cb(new Error('ECONNREFUSED')), 0)
    })

    const manager = new MqttManager()
    const result = await manager.connect(baseProfile, noopEmit)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ECONNREFUSED/i)
  })
})
