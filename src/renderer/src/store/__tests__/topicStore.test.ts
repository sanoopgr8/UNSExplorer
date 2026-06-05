import { describe, it, expect, beforeEach } from 'vitest'
import { useTopicStore } from '../topicStore'
import type { MqttMessage } from '../../types'

function makeMsg(overrides: Partial<MqttMessage> = {}): MqttMessage {
  return {
    id: Math.random().toString(),
    brokerId: 'broker1',
    topic: 'factory/line1/sensor',
    payload: '{"value":42}',
    qos: 0,
    retain: false,
    timestamp: Date.now(),
    ...overrides,
  }
}

beforeEach(() => {
  // Reset store to initial state before each test
  useTopicStore.setState({
    nodes: new Map(),
    roots: new Map(),
    history: new Map(),
    selectedTopic: null,
    expandedPaths: new Set(),
    pinnedTopics: new Set(),
  })
})

describe('ingestMessage', () => {
  it('builds a topic node tree from a message', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'factory/line1/sensor' }))
    const { nodes } = useTopicStore.getState()
    expect(nodes.has('broker1::factory')).toBe(true)
    expect(nodes.has('broker1::factory/line1')).toBe(true)
    expect(nodes.has('broker1::factory/line1/sensor')).toBe(true)
  })

  it('marks only the leaf node as isLeaf', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b/c' }))
    const { nodes } = useTopicStore.getState()
    expect(nodes.get('broker1::a')!.isLeaf).toBe(false)
    expect(nodes.get('broker1::a/b')!.isLeaf).toBe(false)
    expect(nodes.get('broker1::a/b/c')!.isLeaf).toBe(true)
  })

  it('increments messageCount on all ancestors', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b/c' }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b/c' }))
    const { nodes } = useTopicStore.getState()
    expect(nodes.get('broker1::a')!.messageCount).toBe(2)
    expect(nodes.get('broker1::a/b')!.messageCount).toBe(2)
    expect(nodes.get('broker1::a/b/c')!.messageCount).toBe(2)
  })

  it('stores lastMessage on leaf node', () => {
    const msg = makeMsg({ topic: 'x/y', payload: 'hello' })
    useTopicStore.getState().ingestMessage(msg)
    const leaf = useTopicStore.getState().nodes.get('broker1::x/y')!
    expect(leaf.lastMessage?.payload).toBe('hello')
  })

  it('stores message in history keyed by brokerId::topic', () => {
    const msg = makeMsg({ topic: 'sens/temp' })
    useTopicStore.getState().ingestMessage(msg)
    const { history } = useTopicStore.getState()
    expect(history.has('broker1::sens/temp')).toBe(true)
    expect(history.get('broker1::sens/temp')).toHaveLength(1)
  })

  it('caps history at MAX_HISTORY (100) messages', () => {
    for (let i = 0; i < 110; i++) {
      useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b', id: String(i) }))
    }
    const { history } = useTopicStore.getState()
    expect(history.get('broker1::a/b')!.length).toBe(100)
  })

  it('stores newest message first in history', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a', payload: 'first', timestamp: 1000 }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a', payload: 'second', timestamp: 2000 }))
    const msgs = useTopicStore.getState().history.get('broker1::a')!
    expect(msgs[0].payload).toBe('second')
    expect(msgs[1].payload).toBe('first')
  })

  it('handles single-segment topics', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'root' }))
    const { nodes } = useTopicStore.getState()
    const node = nodes.get('broker1::root')!
    expect(node).toBeDefined()
    expect(node.isLeaf).toBe(true)
  })

  it('separates topics from different brokers', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 't/1', brokerId: 'brokerA' }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 't/1', brokerId: 'brokerB' }))
    const { nodes } = useTopicStore.getState()
    expect(nodes.has('brokerA::t/1')).toBe(true)
    expect(nodes.has('brokerB::t/1')).toBe(true)
  })
})

describe('selectTopic', () => {
  it('sets selectedTopic', () => {
    useTopicStore.getState().selectTopic('broker1::a/b')
    expect(useTopicStore.getState().selectedTopic).toBe('broker1::a/b')
  })

  it('clears selectedTopic when null is passed', () => {
    useTopicStore.getState().selectTopic('broker1::a/b')
    useTopicStore.getState().selectTopic(null)
    expect(useTopicStore.getState().selectedTopic).toBeNull()
  })
})

describe('toggleExpand', () => {
  it('adds path to expandedPaths', () => {
    useTopicStore.getState().toggleExpand('broker1::a')
    expect(useTopicStore.getState().expandedPaths.has('broker1::a')).toBe(true)
  })

  it('removes path if already expanded', () => {
    useTopicStore.getState().toggleExpand('broker1::a')
    useTopicStore.getState().toggleExpand('broker1::a')
    expect(useTopicStore.getState().expandedPaths.has('broker1::a')).toBe(false)
  })
})

describe('togglePin', () => {
  it('pins a topic', () => {
    useTopicStore.getState().togglePin('broker1::a/b')
    expect(useTopicStore.getState().pinnedTopics.has('broker1::a/b')).toBe(true)
  })

  it('unpins a pinned topic', () => {
    useTopicStore.getState().togglePin('broker1::a/b')
    useTopicStore.getState().togglePin('broker1::a/b')
    expect(useTopicStore.getState().pinnedTopics.has('broker1::a/b')).toBe(false)
  })
})

describe('clearBroker', () => {
  it('removes all nodes, history, and roots for the broker', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b', brokerId: 'broker1' }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'c/d', brokerId: 'broker2' }))
    useTopicStore.getState().clearBroker('broker1')
    const { nodes, history, roots } = useTopicStore.getState()
    expect([...nodes.keys()].some((k) => k.startsWith('broker1::'))).toBe(false)
    expect([...history.keys()].some((k) => k.startsWith('broker1::'))).toBe(false)
    expect(roots.has('broker1')).toBe(false)
    // broker2 still intact
    expect(nodes.has('broker2::c/d')).toBe(true)
  })
})

describe('getHistory', () => {
  it('returns messages for a topic across all brokers, sorted newest-first', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'x', brokerId: 'b1', timestamp: 1000 }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'x', brokerId: 'b1', timestamp: 3000 }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'x', brokerId: 'b2', timestamp: 2000 }))
    const msgs = useTopicStore.getState().getHistory('x')
    expect(msgs).toHaveLength(3)
    expect(msgs[0].timestamp).toBe(3000)
    expect(msgs[2].timestamp).toBe(1000)
  })

  it('returns empty array for unknown topic', () => {
    expect(useTopicStore.getState().getHistory('nonexistent')).toEqual([])
  })
})

describe('allTopicPaths', () => {
  it('returns only leaf paths', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b/c' }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'a/b/d' }))
    const paths = useTopicStore.getState().allTopicPaths()
    expect(paths).toContain('a/b/c')
    expect(paths).toContain('a/b/d')
    expect(paths).not.toContain('a/b')
    expect(paths).not.toContain('a')
  })

  it('deduplicates paths', () => {
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'x/y' }))
    useTopicStore.getState().ingestMessage(makeMsg({ topic: 'x/y' }))
    const paths = useTopicStore.getState().allTopicPaths()
    const count = paths.filter((p) => p === 'x/y').length
    expect(count).toBe(1)
  })
})
