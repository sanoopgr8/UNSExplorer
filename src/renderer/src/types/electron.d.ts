import type { BrokerProfile } from './index'

interface ElectronAPI {
  // Profiles
  listProfiles: () => Promise<BrokerProfile[]>
  saveProfile: (profile: BrokerProfile) => Promise<BrokerProfile[]>
  deleteProfile: (id: string) => Promise<BrokerProfile[]>

  // MQTT
  connect: (profile: BrokerProfile) => Promise<{ ok: boolean; error?: string }>
  disconnect: (brokerId: string) => Promise<void>
  publish: (args: { brokerId: string; topic: string; payload: string; qos: 0|1|2; retain: boolean }) => Promise<{ ok: boolean; error?: string }>
  updateSubscriptions: (args: { brokerId: string; add?: string[]; remove?: string[] }) => Promise<{ ok: boolean; error?: string }>
  allStatus: () => Promise<Record<string, { connected: boolean; messageCount: number; latency: number; connectedAt: number }>>

  // Events
  onBrokerConnected: (cb: (d: { brokerId: string }) => void) => void
  onBrokerDisconnected: (cb: (d: { brokerId: string }) => void) => void
  onBrokerReconnecting: (cb: (d: { brokerId: string }) => void) => void
  onBrokerError: (cb: (d: { brokerId: string; error: string }) => void) => void
  onBrokerLatency: (cb: (d: { brokerId: string; latency: number }) => void) => void
  onBrokerInfo: (cb: (d: { brokerId: string; message: string }) => void) => void
  onMessage: (cb: (msg: unknown) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
