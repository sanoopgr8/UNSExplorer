# UNS Explorer

An enterprise-grade desktop application for OT/IT engineers to explore, monitor, audit, and interact with **ISA-95 Unified Namespace (UNS)** MQTT broker hierarchies.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![MQTT](https://img.shields.io/badge/MQTT-3.1.1%20%2F%205.0-660066)

---

## Features

| Feature | Description |
|---|---|
| **Multi-Broker Profiles** | Connect to multiple MQTT brokers simultaneously; named, colour-coded profiles persisted to disk |
| **ISA-95 Topic Tree** | Live hierarchical tree: Enterprise → Site → Area → Line → Cell → Device with message counts and level badges |
| **Topic Subscriptions** | User-controlled topic filters per broker — preset chips (`#`, `spBv1.0/#`, `factory/#`) plus custom patterns |
| **Global Search** | `Ctrl+K` fuzzy search across all topic paths and payloads; multi-word AND filtering |
| **Payload Inspector** | JSON syntax highlighting, raw/formatted toggle, message history (last 100), copy to clipboard |
| **Write Mode** | Safety-guarded publish panel with message templates, QoS selector, retain flag |
| **Metadata Panel** | Per-topic metadata, JSON field extraction, broker health (latency, message rate) |

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Node.js | **18 LTS** | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Bundled with Node.js |
| Git | any | [git-scm.com](https://git-scm.com) |

> **macOS only:** Xcode Command Line Tools are required for native module compilation.
> Run `xcode-select --install` if prompted.

---

## Quick Start (Development)

```bash
# 1. Clone
git clone https://github.com/sanoopgr8/UNSExplorer.git
cd UNSExplorer

# 2. Install dependencies
npm install

# 3. Start dev mode  (Vite dev server + Electron with hot-reload)
npm run dev
```

The app opens as a desktop window loading from `http://localhost:3000`.
The Vite dev server provides HMR for renderer changes; main-process changes require a restart.

---

## Deployment (Build Installers)

### One-command deploy

Use the provided deploy scripts — they handle prerequisites check, build, and packaging automatically.

#### Windows

```powershell
# From the project root in PowerShell:
.\scripts\deploy.ps1              # Build NSIS installer (.exe)
.\scripts\deploy.ps1 -PackOnly   # Build unpacked app (faster, no installer)
.\scripts\deploy.ps1 -Dev        # Start development mode
.\scripts\deploy.ps1 -Clean      # Clean dist\ and release\ then build
```

#### Linux / macOS

```bash
# Make the script executable (first time only):
chmod +x scripts/deploy.sh

# Build installer for the current platform:
./scripts/deploy.sh              # AppImage (Linux) or DMG (macOS)
./scripts/deploy.sh --pack-only  # Unpacked app, no installer
./scripts/deploy.sh --dev        # Start development mode
./scripts/deploy.sh --clean      # Clean dist/ and release/ then build
```

#### Cross-platform via Node.js (any platform)

```bash
npm run deploy                   # auto-detects OS
npm run deploy -- --dev
npm run deploy -- --pack-only
npm run deploy -- --clean
```

---

### Manual build (step by step)

```bash
# Step 1 — Install dependencies
npm ci

# Step 2 — Compile Electron main process + preload
npm run build:main

# Step 3 — Build renderer (React/Vite)
npm run build:renderer

# Step 4 — Package (choose your platform)
npm run dist:win       # Windows  -> release/*.exe
npm run dist:mac       # macOS    -> release/*.dmg
npm run dist:linux     # Linux    -> release/*.AppImage
npm run dist           # current platform
npm run pack           # current platform, unpacked (no installer)
```

---

### Output locations

| Platform | Type | Path |
|---|---|---|
| Windows | NSIS Installer | `release/UNS Explorer Setup x.x.x.exe` |
| macOS | DMG | `release/UNS Explorer-x.x.x.dmg` |
| Linux | AppImage | `release/UNS Explorer-x.x.x.AppImage` |
| All | Unpacked | `release/win-unpacked/`, `release/mac/`, `release/linux-unpacked/` |

---

## Platform-specific notes

### Windows
- Run the NSIS installer as **Administrator** if installing system-wide
- If PowerShell blocks the deploy script, run:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

### macOS
- First launch: right-click the app → **Open** to bypass Gatekeeper (unsigned build)
- Code signing requires an Apple Developer account — see [electron-builder docs](https://www.electron.build/code-signing)

### Linux
- Make the AppImage executable before running:
  ```bash
  chmod +x "UNS Explorer-x.x.x.AppImage"
  ./"UNS Explorer-x.x.x.AppImage"
  ```
- Requires `libfuse2` on Ubuntu 22.04+:
  ```bash
  sudo apt install libfuse2
  ```

---

## Connecting to a Broker

### Add a broker profile

1. Click **`+`** in the Brokers panel → fill in host, port, protocol
2. Add **Topic Subscriptions** — select presets or type custom filters:
   - `#` — all topics (may be denied by some brokers)
   - `factory/#` — all topics under `factory/`
   - `Acme/Detroit/#` — site-specific UNS subtree
   - `spBv1.0/#` — all Sparkplug B messages
3. Click **Save Profile** → **Connect**

### Public test brokers

| Broker | Host | Port | Protocol | Notes |
|---|---|---|---|---|
| EMQX | `broker.emqx.io` | `1883` | `mqtt` | Active traffic on `testtopic/#` |
| Mosquitto | `test.mosquitto.org` | `1883` | `mqtt` | Public, mixed traffic |
| HiveMQ | `broker.hivemq.com` | `1883` | `mqtt` | Use specific prefixes (wildcard `#` denied) |
| HiveMQ WS | `broker.hivemq.com` | `8000` | `ws` | WebSocket — useful behind firewalls |

### Local broker (recommended for production)

```bash
# Mosquitto via Docker
docker run -d -p 1883:1883 --name mqtt eclipse-mosquitto \
  mosquitto -c /mosquitto-no-auth.conf

# Publish test UNS data
mosquitto_pub -h localhost -t "Acme/Detroit/Assembly/Line1/Welder01/temp" \
  -m '{"value":87.4,"unit":"C","quality":"good"}' -r
```

---

## Publishing Messages

1. Click **`● Read Only`** in the status bar → confirm → turns red (**Write Mode ON**)
2. Click **`⬆ Publish`** in the Payload Inspector toolbar
3. Open the right panel (`⊞` toggle) — the Publish panel appears
4. Select broker, enter topic path, choose a template or type JSON payload
5. Click **`⬆ Publish Message`**

The topic appears in the tree immediately after publishing.

---

## Project Structure

```
UNSExplorer/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # App bootstrap, IPC handlers
│   │   ├── mqtt-manager.ts # MQTT connection management
│   │   └── profile-store.ts# Broker profile persistence
│   ├── preload/
│   │   └── index.ts        # contextBridge IPC API
│   └── renderer/
│       └── src/
│           ├── App.tsx           # Root layout (3-panel)
│           ├── components/       # UI components
│           ├── store/            # Zustand state stores
│           ├── hooks/            # useMqttBridge IPC bridge
│           ├── lib/              # Payload decoder, utilities
│           └── types/            # Shared TypeScript types
├── scripts/
│   ├── deploy.sh           # Linux/macOS deploy script
│   ├── deploy.ps1          # Windows PowerShell deploy script
│   └── deploy.js           # Cross-platform Node.js entry point
├── resources/              # App icons (icon.ico, .icns, .png)
├── electron-builder.yml    # Packaging configuration
├── vite.config.ts          # Vite config (renderer)
├── tsconfig.json           # Renderer TypeScript config
└── tsconfig.node.json      # Main process TypeScript config
```

---

## Architecture

```
Electron Main Process (Node.js)
  MQTT Manager (mqtt.js)  |  Profile Store (JSON)  |  IPC Handlers
          |                                                 |
          |          Preload (contextBridge)                |
          |                                                 |
Renderer Process (React + TypeScript)
  useMqttBridge hook  <--  IPC events
          |
  Zustand stores: BrokerStore | TopicStore | UIStore
          |
  Components: BrokerSidebar | TopicTree | PayloadInspector
              MetadataPanel | GlobalSearch | PublishPanel
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 31 + electron-builder |
| Frontend framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 |
| MQTT client | MQTT.js 5 (runs in main process) |
| State management | Zustand 4 |
| UI components | Tailwind CSS 3 |
| Persistent storage | electron-store (profiles, settings) |
| Fuzzy search | Fuse.js 7 |

---

## Roadmap

### Phase 1 — MVP (complete)
- [x] Multi-broker profiles with named connections
- [x] ISA-95 dynamic topic tree with real-time message counts
- [x] User-controlled topic subscriptions (no forced wildcard)
- [x] Global fuzzy search (Ctrl+K)
- [x] JSON syntax-highlighted payload inspector + message history
- [x] Read/Write toggle with publish panel and message templates

### Phase 2 — Advanced (planned)
- [ ] Sparkplug B Protobuf decoder (NBIRTH / DBIRTH / NDATA / DDATA)
- [ ] Schema compliance auditing against ISA-95 and JSON Schema
- [x] Historical sparklines per topic
- [ ] Stale data / TTL tracking with configurable thresholds
- [ ] Audit log export (CSV / JSON)

---

## Contributing

Pull requests are welcome. Please open an issue first for major changes.

```bash
git checkout -b feat/your-feature
# make changes
npm run build:main && npx tsc --noEmit   # verify no TypeScript errors
git commit -m "feat: description"
git push origin feat/your-feature
```

---

## License

MIT
