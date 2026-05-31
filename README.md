# UNS Explorer

UNS Explorer is an enterprise-grade desktop application for OT/IT engineers to explore, monitor, audit, and interact with ISA-95 Unified Namespace (UNS) MQTT broker hierarchies.

## What it does

- Presents ISA-95 MQTT topic hierarchies as a dynamic tree: Enterprise > Site > Area > Line > Cell > Device
- Supports multiple broker profiles and simultaneous connections
- Decodes Sparkplug B payloads and formats JSON, text, and binary data
- Tracks data freshness with TTL/stale data warnings
- Provides audit and schema validation for industrial data governance
- Includes safe publish/simulation capabilities behind a read/write toggle

## Key features

- Multi-broker session management with named profiles
- Live topic tree with broker color indicators and node counts
- Global search across topic paths and payloads
- Sparkplug B Protobuf decoding for NBIRTH, DBIRTH, NDATA, DDATA, NDEATH, DDEATH
- Payload history, copy/export, and raw/decoded inspection
- ISA-95 compliance auditing, quality scoring, and exportable audit logs
- Publish mode, message templates, replay, and synthetic data simulation

## Technology stack

- Electron + React + TypeScript
- Vite for development and build
- MQTT.js for broker connectivity
- Zustand for application state
- Tailwind CSS for UI styling
- Recharts for charts and sparklines
- electron-store for persistent settings and profiles

## Architecture

- Main process: manages MQTT connections, file I/O, credential encryption, and IPC
- Renderer process: React UI rendering, payload inspection, audit engine, and charts
- Preload script: secure contextBridge exposing a typed IPC API
- MQTT client runs in the Main process to avoid renderer WebSocket limitations
- Messages are batched and sent to the renderer at a controlled rate to protect UI performance

## Project goals

- Reduce time-to-insight for UNS engineers
- Enforce ISA-95 topic conventions and schema compliance
- Accelerate Sparkplug B adoption with built-in decoding
- Improve industrial data quality and operational visibility
- Keep setup friction low with broker profiles and session persistence

## Status

This project is designed as a phased product:
- Phase 1: MVP with multi-broker profiles, live ISA-95 tree, search, payload inspection, and read-only/read-write controls
- Phase 2: Advanced Sparkplug B decoding, schema auditing, historical sparklines, TTL tracking, and governance workflows
