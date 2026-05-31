import { create } from 'zustand'
import type { BrokerProfile, BrokerState, BrokerStatus } from '../types'

interface BrokerStore {
  profiles: BrokerProfile[]
  brokers: Map<string, BrokerState>
  loadProfiles: () => Promise<void>
  saveProfile: (profile: BrokerProfile) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  connect: (profile: BrokerProfile) => Promise<{ ok: boolean; error?: string }>
  disconnect: (brokerId: string) => Promise<void>
  setStatus: (brokerId: string, status: BrokerStatus, error?: string) => void
  setLatency: (brokerId: string, latency: number) => void
  setInfo: (brokerId: string, info: string) => void
  incrementMessages: (brokerId: string) => void
}

export const useBrokerStore = create<BrokerStore>((set, get) => ({
  profiles: [],
  brokers: new Map(),

  loadProfiles: async () => {
    const profiles = await window.electronAPI.listProfiles()
    set({ profiles })
  },

  saveProfile: async (profile) => {
    const profiles = await window.electronAPI.saveProfile(profile)
    set({ profiles })
  },

  deleteProfile: async (id) => {
    await window.electronAPI.disconnect(id).catch(() => {})
    const profiles = await window.electronAPI.deleteProfile(id)
    const brokers = new Map(get().brokers)
    brokers.delete(id)
    set({ profiles, brokers })
  },

  connect: async (profile) => {
    const brokers = new Map(get().brokers)
    brokers.set(profile.id, {
      profile,
      status: 'connecting',
      messageCount: 0,
      latency: 0,
    })
    set({ brokers })
    const result = await window.electronAPI.connect(profile)
    if (!result.ok) {
      const b = new Map(get().brokers)
      const s = b.get(profile.id)
      if (s) b.set(profile.id, { ...s, status: 'error', error: result.error })
      set({ brokers: b })
    }
    return result
  },

  disconnect: async (brokerId) => {
    await window.electronAPI.disconnect(brokerId)
    const brokers = new Map(get().brokers)
    const s = brokers.get(brokerId)
    if (s) brokers.set(brokerId, { ...s, status: 'disconnected' })
    set({ brokers })
  },

  setStatus: (brokerId, status, error) => {
    const brokers = new Map(get().brokers)
    const existing = brokers.get(brokerId)
    if (existing) {
      brokers.set(brokerId, {
        ...existing,
        status,
        error,
        connectedAt: status === 'connected' ? Date.now() : existing.connectedAt,
      })
    }
    set({ brokers })
  },

  setLatency: (brokerId, latency) => {
    const brokers = new Map(get().brokers)
    const s = brokers.get(brokerId)
    if (s) brokers.set(brokerId, { ...s, latency })
    set({ brokers })
  },

  setInfo: (brokerId, info) => {
    const brokers = new Map(get().brokers)
    const s = brokers.get(brokerId)
    if (s) brokers.set(brokerId, { ...s, info })
    set({ brokers })
  },

  incrementMessages: (brokerId) => {
    const brokers = new Map(get().brokers)
    const s = brokers.get(brokerId)
    if (s) brokers.set(brokerId, { ...s, messageCount: s.messageCount + 1 })
    set({ brokers })
  },
}))
