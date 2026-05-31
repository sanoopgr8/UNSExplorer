import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Profiles
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  saveProfile: (profile: unknown) => ipcRenderer.invoke('profiles:save', profile),
  deleteProfile: (id: string) => ipcRenderer.invoke('profiles:delete', id),

  // MQTT
  connect: (profile: unknown) => ipcRenderer.invoke('mqtt:connect', profile),
  disconnect: (brokerId: string) => ipcRenderer.invoke('mqtt:disconnect', brokerId),
  publish: (args: unknown) => ipcRenderer.invoke('mqtt:publish', args),
  updateSubscriptions: (args: unknown) => ipcRenderer.invoke('mqtt:subscribe', args),
  allStatus: () => ipcRenderer.invoke('mqtt:status'),

  // Events from main → renderer
  onBrokerConnected: (cb: (d: { brokerId: string }) => void) =>
    ipcRenderer.on('broker:connected', (_e, d) => cb(d)),
  onBrokerDisconnected: (cb: (d: { brokerId: string }) => void) =>
    ipcRenderer.on('broker:disconnected', (_e, d) => cb(d)),
  onBrokerReconnecting: (cb: (d: { brokerId: string }) => void) =>
    ipcRenderer.on('broker:reconnecting', (_e, d) => cb(d)),
  onBrokerError: (cb: (d: { brokerId: string; error: string }) => void) =>
    ipcRenderer.on('broker:error', (_e, d) => cb(d)),
  onBrokerLatency: (cb: (d: { brokerId: string; latency: number }) => void) =>
    ipcRenderer.on('broker:latency', (_e, d) => cb(d)),
  onBrokerInfo: (cb: (d: { brokerId: string; message: string }) => void) =>
    ipcRenderer.on('broker:info', (_e, d) => cb(d)),
  onMessage: (cb: (msg: unknown) => void) =>
    ipcRenderer.on('mqtt:message', (_e, msg) => cb(msg)),

  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
})
