import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { MqttManager } from './mqtt-manager'
import { ProfileStore } from './profile-store'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
const mqttManager = new MqttManager()
const profileStore = new ProfileStore()

function createWindow() {
  mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    const port = process.env.VITE_PORT ?? '3000'
    mainWindow.loadURL(`http://localhost:${port}`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (!mainWindow) createWindow() })

// ── Broker Profile IPC ────────────────────────────────────────────────────────
ipcMain.handle('profiles:list', () => profileStore.list())
ipcMain.handle('profiles:save', (_e, profile) => profileStore.save(profile))
ipcMain.handle('profiles:delete', (_e, id) => profileStore.delete(id))

// ── MQTT IPC ──────────────────────────────────────────────────────────────────
ipcMain.handle('mqtt:connect', async (_e, profile) => {
  return mqttManager.connect(profile, (event, data) => {
    mainWindow?.webContents.send(event, data)
  })
})

ipcMain.handle('mqtt:disconnect', async (_e, brokerId) => {
  return mqttManager.disconnect(brokerId)
})

ipcMain.handle('mqtt:publish', async (_e, { brokerId, topic, payload, qos, retain }) => {
  return mqttManager.publish(brokerId, topic, payload, qos, retain, (event, data) => {
    mainWindow?.webContents.send(event, data)
  })
})

ipcMain.handle('mqtt:subscribe', async (_e, { brokerId, add, remove }) => {
  return mqttManager.updateSubscriptions(brokerId, add ?? [], remove ?? [], (event, data) => {
    mainWindow?.webContents.send(event, data)
  })
})

ipcMain.handle('mqtt:status', () => mqttManager.allStatus())
