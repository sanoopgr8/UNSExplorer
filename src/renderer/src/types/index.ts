export interface BrokerProfile {
  id: string
  name: string
  host: string
  port: number
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss'
  username?: string
  password?: string
  clientId: string
  color: string
  keepalive?: number
  connectTimeout?: number
  subscriptions: string[]   // topic filters, e.g. ["factory/#", "sensor/+/temp"]
}

export type BrokerStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface BrokerState {
  profile: BrokerProfile
  status: BrokerStatus
  error?: string
  info?: string
  messageCount: number
  latency: number
  connectedAt?: number
}

export interface MqttMessage {
  id: string
  brokerId: string
  topic: string
  payload: string
  qos: 0 | 1 | 2
  retain: boolean
  timestamp: number
}

export interface TopicNode {
  segment: string
  fullPath: string
  brokerId: string
  children: Map<string, TopicNode>
  messageCount: number
  lastMessage?: MqttMessage
  lastSeen?: number
  isLeaf: boolean
}

export type PayloadType = 'json' | 'text' | 'binary' | 'empty'

export interface DecodedPayload {
  type: PayloadType
  raw: string
  formatted?: string
  parsed?: unknown
  error?: string
}

export const BROKER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
]
