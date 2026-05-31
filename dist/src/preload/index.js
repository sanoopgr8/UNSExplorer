"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Profiles
    listProfiles: () => electron_1.ipcRenderer.invoke('profiles:list'),
    saveProfile: (profile) => electron_1.ipcRenderer.invoke('profiles:save', profile),
    deleteProfile: (id) => electron_1.ipcRenderer.invoke('profiles:delete', id),
    // MQTT
    connect: (profile) => electron_1.ipcRenderer.invoke('mqtt:connect', profile),
    disconnect: (brokerId) => electron_1.ipcRenderer.invoke('mqtt:disconnect', brokerId),
    publish: (args) => electron_1.ipcRenderer.invoke('mqtt:publish', args),
    updateSubscriptions: (args) => electron_1.ipcRenderer.invoke('mqtt:subscribe', args),
    allStatus: () => electron_1.ipcRenderer.invoke('mqtt:status'),
    // Events from main → renderer
    onBrokerConnected: (cb) => electron_1.ipcRenderer.on('broker:connected', (_e, d) => cb(d)),
    onBrokerDisconnected: (cb) => electron_1.ipcRenderer.on('broker:disconnected', (_e, d) => cb(d)),
    onBrokerReconnecting: (cb) => electron_1.ipcRenderer.on('broker:reconnecting', (_e, d) => cb(d)),
    onBrokerError: (cb) => electron_1.ipcRenderer.on('broker:error', (_e, d) => cb(d)),
    onBrokerLatency: (cb) => electron_1.ipcRenderer.on('broker:latency', (_e, d) => cb(d)),
    onBrokerInfo: (cb) => electron_1.ipcRenderer.on('broker:info', (_e, d) => cb(d)),
    onMessage: (cb) => electron_1.ipcRenderer.on('mqtt:message', (_e, msg) => cb(msg)),
    removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel),
});
