import { create } from 'zustand'
import type { MqttMessage, TopicNode } from '../types'

const MAX_HISTORY = 100

interface TopicStore {
  // topic path → TopicNode (flat index for fast lookup)
  nodes: Map<string, TopicNode>
  // brokerId → root children map
  roots: Map<string, Map<string, TopicNode>>
  // topic path → message history
  history: Map<string, MqttMessage[]>
  selectedTopic: string | null
  expandedPaths: Set<string>
  pinnedTopics: Set<string>

  ingestMessage: (msg: MqttMessage) => void
  selectTopic: (path: string | null) => void
  toggleExpand: (path: string) => void
  togglePin: (path: string) => void
  clearBroker: (brokerId: string) => void
  getHistory: (topic: string) => MqttMessage[]
  allTopicPaths: () => string[]
}

function ensureNode(
  nodes: Map<string, TopicNode>,
  fullPath: string,
  segment: string,
  brokerId: string,
  parent: Map<string, TopicNode>,
): TopicNode {
  const key = `${brokerId}::${fullPath}`
  if (!nodes.has(key)) {
    const node: TopicNode = {
      segment,
      fullPath,
      brokerId,
      children: new Map(),
      messageCount: 0,
      isLeaf: false,
    }
    nodes.set(key, node)
    parent.set(segment, node)
  }
  return nodes.get(key)!
}

export const useTopicStore = create<TopicStore>((set, get) => ({
  nodes: new Map(),
  roots: new Map(),
  history: new Map(),
  selectedTopic: null,
  expandedPaths: new Set(),
  pinnedTopics: new Set(),

  ingestMessage: (msg) => {
    const { nodes, roots, history } = get()
    const newNodes = new Map(nodes)
    const newRoots = new Map(roots)
    const newHistory = new Map(history)

    if (!newRoots.has(msg.brokerId)) newRoots.set(msg.brokerId, new Map())
    const brokerRoot = newRoots.get(msg.brokerId)!

    const segments = msg.topic.split('/')
    let parent = brokerRoot
    let currentPath = ''

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      currentPath = i === 0 ? seg : `${currentPath}/${seg}`
      const node = ensureNode(newNodes, currentPath, seg, msg.brokerId, parent)
      node.messageCount++
      node.lastSeen = msg.timestamp

      if (i === segments.length - 1) {
        node.isLeaf = true
        node.lastMessage = msg
      }
      parent = node.children
    }

    // Update history
    const histKey = `${msg.brokerId}::${msg.topic}`
    const existing = newHistory.get(histKey) ?? []
    const updated = [msg, ...existing].slice(0, MAX_HISTORY)
    newHistory.set(histKey, updated)

    set({ nodes: newNodes, roots: newRoots, history: newHistory })
  },

  selectTopic: (path) => set({ selectedTopic: path }),

  toggleExpand: (path) => {
    const expanded = new Set(get().expandedPaths)
    if (expanded.has(path)) expanded.delete(path)
    else expanded.add(path)
    set({ expandedPaths: expanded })
  },

  togglePin: (path) => {
    const pinned = new Set(get().pinnedTopics)
    if (pinned.has(path)) pinned.delete(path)
    else pinned.add(path)
    set({ pinnedTopics: pinned })
  },

  clearBroker: (brokerId) => {
    const newNodes = new Map(get().nodes)
    const newRoots = new Map(get().roots)
    const newHistory = new Map(get().history)
    for (const key of newNodes.keys()) {
      if (key.startsWith(`${brokerId}::`)) newNodes.delete(key)
    }
    for (const key of newHistory.keys()) {
      if (key.startsWith(`${brokerId}::`)) newHistory.delete(key)
    }
    newRoots.delete(brokerId)
    set({ nodes: newNodes, roots: newRoots, history: newHistory })
  },

  getHistory: (topic) => {
    // Returns history across all brokers for the topic, or for a specific key
    const all: MqttMessage[] = []
    for (const [key, msgs] of get().history) {
      if (key.endsWith(`::${topic}`)) all.push(...msgs)
    }
    return all.sort((a, b) => b.timestamp - a.timestamp)
  },

  allTopicPaths: () => {
    const paths: string[] = []
    for (const node of get().nodes.values()) {
      if (node.isLeaf) paths.push(node.fullPath)
    }
    return [...new Set(paths)]
  },
}))
