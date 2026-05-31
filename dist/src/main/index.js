"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const mqtt_manager_1 = require("./mqtt-manager");
const profile_store_1 = require("./profile-store");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
const mqttManager = new mqtt_manager_1.MqttManager();
const profileStore = new profile_store_1.ProfileStore();
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        backgroundColor: '#0f1117',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0f1117',
            symbolColor: '#6b7280',
            height: 32,
        },
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    if (isDev) {
        const port = process.env.VITE_PORT ?? '3000';
        mainWindow.loadURL(`http://localhost:${port}`);
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => { mainWindow = null; });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
electron_1.app.on('activate', () => { if (!mainWindow)
    createWindow(); });
// ── Broker Profile IPC ────────────────────────────────────────────────────────
electron_1.ipcMain.handle('profiles:list', () => profileStore.list());
electron_1.ipcMain.handle('profiles:save', (_e, profile) => profileStore.save(profile));
electron_1.ipcMain.handle('profiles:delete', (_e, id) => profileStore.delete(id));
// ── MQTT IPC ──────────────────────────────────────────────────────────────────
electron_1.ipcMain.handle('mqtt:connect', async (_e, profile) => {
    return mqttManager.connect(profile, (event, data) => {
        mainWindow?.webContents.send(event, data);
    });
});
electron_1.ipcMain.handle('mqtt:disconnect', async (_e, brokerId) => {
    return mqttManager.disconnect(brokerId);
});
electron_1.ipcMain.handle('mqtt:publish', async (_e, { brokerId, topic, payload, qos, retain }) => {
    return mqttManager.publish(brokerId, topic, payload, qos, retain);
});
electron_1.ipcMain.handle('mqtt:subscribe', async (_e, { brokerId, add, remove }) => {
    return mqttManager.updateSubscriptions(brokerId, add ?? [], remove ?? [], (event, data) => {
        mainWindow?.webContents.send(event, data);
    });
});
electron_1.ipcMain.handle('mqtt:status', () => mqttManager.allStatus());
