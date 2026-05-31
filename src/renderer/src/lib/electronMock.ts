// Stub for running outside Electron (browser preview / web mode).
// All MQTT calls are no-ops; state is managed in-memory.

import type { BrokerProfile } from '../types'

const PROFILES_KEY = 'uns_broker_profiles'

function loadProfiles(): BrokerProfile[] {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]')
  } catch {
    return []
  }
}

function persistProfiles(profiles: BrokerProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  return profiles
}

const noop = () => {}

const mockAPI: Window['electronAPI'] = {
  listProfiles: async () => loadProfiles(),

  saveProfile: async (profile) => {
    const all = loadProfiles()
    const idx = all.findIndex((p) => p.id === profile.id)
    if (idx >= 0) all[idx] = profile
    else all.push(profile)
    return persistProfiles(all)
  },

  deleteProfile: async (id) => {
    return persistProfiles(loadProfiles().filter((p) => p.id !== id))
  },

  connect: async (_profile) => ({
    ok: false,
    error: 'Running in browser preview — MQTT requires Electron desktop app.',
  }),

  disconnect: async (_id) => {},

  publish: async (_args) => ({
    ok: false,
    error: 'Running in browser preview — MQTT requires Electron.',
  }),
  updateSubscriptions: async (_args) => ({ ok: true }),

  allStatus: async () => ({}),

  onBrokerConnected: noop,
  onBrokerDisconnected: noop,
  onBrokerReconnecting: noop,
  onBrokerError: noop,
  onBrokerLatency: noop,
  onBrokerInfo: noop,
  onMessage: noop,
  removeAllListeners: noop,
}

export function installMockIfNeeded() {
  if (!window.electronAPI) {
    window.electronAPI = mockAPI
  }
}
