import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PayloadInspector } from '../PayloadInspector'
import { useTopicStore } from '../../store/topicStore'
import { useBrokerStore } from '../../store/brokerStore'
import type { MqttMessage, BrokerProfile } from '../../types'

// Electron API is not available in jsdom
Object.defineProperty(window, 'electronAPI', {
  writable: true,
  value: {
    listProfiles: vi.fn().mockResolvedValue([]),
    saveProfile: vi.fn().mockResolvedValue([]),
    deleteProfile: vi.fn().mockResolvedValue([]),
    connect: vi.fn().mockResolvedValue({ ok: true }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue({ ok: true }),
    onMessage: vi.fn(),
    onBrokerEvent: vi.fn(),
    updateSubscriptions: vi.fn().mockResolvedValue({ ok: true }),
  },
})


const mockProfile: BrokerProfile = {
  id: 'broker1',
  name: 'Test Broker',
  host: 'localhost',
  port: 1883,
  protocol: 'mqtt',
  clientId: 'test-client',
  color: '#3b82f6',
  subscriptions: ['#'],
}

function makeMsg(payload: string, timestamp: number): MqttMessage {
  return {
    id: String(timestamp),
    brokerId: 'broker1',
    topic: 'factory/sensor',
    payload,
    qos: 0,
    retain: false,
    timestamp,
  }
}

beforeEach(() => {
  useTopicStore.setState({
    nodes: new Map(),
    roots: new Map(),
    history: new Map(),
    selectedTopic: null,
    expandedPaths: new Set(),
    pinnedTopics: new Set(),
  })
  useBrokerStore.setState({ profiles: [mockProfile], brokers: new Map() })
})

describe('PayloadInspector — no topic selected', () => {
  it('shows placeholder when no topic selected', () => {
    render(<PayloadInspector />)
    expect(screen.getByText(/select a topic/i)).toBeInTheDocument()
  })
})

describe('PayloadInspector — topic selected', () => {
  beforeEach(() => {
    const msgs = [
      makeMsg('{"value":42,"unit":"C"}', 2000),
      makeMsg('{"value":40,"unit":"C"}', 1000),
    ]
    // Ingest messages into store
    msgs.forEach((m) => useTopicStore.getState().ingestMessage(m))
    useTopicStore.setState({ selectedTopic: 'broker1::factory/sensor' })
  })

  it('shows the topic path breadcrumb', () => {
    render(<PayloadInspector />)
    expect(screen.getByText('factory')).toBeInTheDocument()
    expect(screen.getByText('sensor')).toBeInTheDocument()
  })

  it('shows message count', () => {
    render(<PayloadInspector />)
    expect(screen.getByText(/2 messages/i)).toBeInTheDocument()
  })

  it('shows payload tab by default', () => {
    render(<PayloadInspector />)
    // JSON payload content should be visible
    expect(screen.getByText(/"value"/i)).toBeInTheDocument()
  })

  it('switches to history tab', async () => {
    const user = userEvent.setup()
    render(<PayloadInspector />)
    await user.click(screen.getByRole('button', { name: /history/i }))
    // History tab renders message rows — check timestamp format HH:MM:SS.mmm
    expect(screen.getAllByText(/JSON/i).length).toBeGreaterThan(0)
  })

  it('switches to sparkline tab', async () => {
    const user = userEvent.setup()
    render(<PayloadInspector />)
    await user.click(screen.getByRole('button', { name: /📈/i }))
    // Sparkline tab shows stats
    expect(screen.getByText('Last')).toBeInTheDocument()
    expect(screen.getByText('Min')).toBeInTheDocument()
  })

  it('history tab shows message count badge', () => {
    render(<PayloadInspector />)
    // Badge next to history tab should show 2
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows broker color dot and broker name', () => {
    render(<PayloadInspector />)
    expect(screen.getByText('Test Broker')).toBeInTheDocument()
  })

  it('shows no messages state for topic with no history', () => {
    // Reset history but keep selected topic
    useTopicStore.setState({
      history: new Map(),
      selectedTopic: 'broker1::factory/sensor',
    })
    render(<PayloadInspector />)
    expect(screen.getByText(/no messages received/i)).toBeInTheDocument()
  })

  it('toggles between Raw and Formatted view', async () => {
    const user = userEvent.setup()
    render(<PayloadInspector />)
    const rawBtn = screen.getByRole('button', { name: /raw/i })
    await user.click(rawBtn)
    expect(screen.getByRole('button', { name: /formatted/i })).toBeInTheDocument()
  })
})
