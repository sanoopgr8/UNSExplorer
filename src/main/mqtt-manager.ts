import * as mqtt from 'mqtt'
import * as net from 'net'

type EventEmitter = (event: string, data: unknown) => void

interface BrokerConnection {
  client: mqtt.MqttClient
  profile: BrokerProfile
  messageCount: number
  connectedAt: number
  latency: number
  pingTimer?: NodeJS.Timeout
  reconnectTimer?: NodeJS.Timeout
}

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
  subscriptions: string[]
}

const RECONNECT_DELAY_MS = 8000

export class MqttManager {
  private connections = new Map<string, BrokerConnection>()

  private tcpReachable(host: string, port: number, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket()
      socket.setTimeout(timeoutMs)
      socket.once('connect', () => { socket.destroy(); resolve() })
      socket.once('timeout', () => { socket.destroy(); reject(new Error(`TCP timeout — nothing listening at ${host}:${port}`)) })
      socket.once('error', (err) => { socket.destroy(); reject(new Error(`TCP error: ${err.message}`)) })
      socket.connect(port, host)
    })
  }

  async connect(profile: BrokerProfile, emit: EventEmitter): Promise<{ ok: boolean; error?: string }> {
    if (this.connections.has(profile.id)) {
      await this.disconnect(profile.id)
    }

    console.log(`[MQTT] Connecting to ${profile.protocol}://${profile.host}:${profile.port}`)

    if (profile.protocol === 'mqtt' || profile.protocol === 'mqtts') {
      try {
        await this.tcpReachable(profile.host, profile.port, 5000)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[MQTT] TCP pre-check failed: ${msg}`)
        return { ok: false, error: msg }
      }
    }

    return this._doConnect(profile, emit)
  }

  private _doConnect(
    profile: BrokerProfile,
    emit: EventEmitter,
  ): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const url = `${profile.protocol}://${profile.host}:${profile.port}`
      const opts: mqtt.IClientOptions = {
        clientId: profile.clientId || `uns-explorer-${Date.now()}`,
        username: profile.username || undefined,
        password: profile.password || undefined,
        keepalive: profile.keepalive ?? 60,
        connectTimeout: profile.connectTimeout ?? 8000,
        reconnectPeriod: 0,   // we manage reconnect ourselves
        clean: true,
      }

      let resolved = false
      const client = mqtt.connect(url, opts)

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.error(`[MQTT] Handshake timed out for ${url}`)
          client.end(true)
          resolve({ ok: false, error: 'MQTT handshake timed out' })
        }
      }, (profile.connectTimeout ?? 8000) + 2000)

      client.on('connect', () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          console.log(`[MQTT] Connected to ${url}`)
        }

        const conn: BrokerConnection = {
          client,
          profile,
          messageCount: 0,
          connectedAt: Date.now(),
          latency: 0,
        }
        this.connections.set(profile.id, conn)
        emit('broker:connected', { brokerId: profile.id })
        resolve({ ok: true })

        this._subscribe(conn, emit)

        conn.pingTimer = setInterval(() => {
          const start = Date.now()
          client.publish(`$uns-explorer/ping/${profile.id}`, '', { qos: 0 }, () => {
            conn.latency = Date.now() - start
            emit('broker:latency', { brokerId: profile.id, latency: conn.latency })
          })
        }, 15000)
      })

      client.on('message', (topic, payload, packet) => {
        const conn = this.connections.get(profile.id)
        if (conn) conn.messageCount++
        emit('mqtt:message', {
          brokerId: profile.id,
          topic,
          payload: payload.toString(),
          qos: packet.qos,
          retain: packet.retain,
          timestamp: Date.now(),
        })
      })

      client.on('error', (err) => {
        console.error(`[MQTT] Error for ${url}: ${err.message}`)
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          client.end(true)
          resolve({ ok: false, error: err.message })
        }
        emit('broker:error', { brokerId: profile.id, error: err.message })
      })

      client.on('close', () => {
        const conn = this.connections.get(profile.id)
        console.log(`[MQTT] Connection closed for ${profile.id}`)
        emit('broker:disconnected', { brokerId: profile.id })

        // Schedule reconnect if we still have this connection tracked
        if (conn) {
          clearInterval(conn.pingTimer)
          clearTimeout(conn.reconnectTimer)
          conn.reconnectTimer = setTimeout(() => {
            if (!this.connections.has(profile.id)) return
            console.log(`[MQTT] Reconnecting to ${url}...`)
            emit('broker:reconnecting', { brokerId: profile.id })
            this.connections.delete(profile.id)
            this._doConnect(profile, emit)
          }, RECONNECT_DELAY_MS)
        }
      })
    })
  }

  private _subscribe(conn: BrokerConnection, emit: EventEmitter) {
    const filters = conn.profile.subscriptions?.filter(s => s.trim()) ?? []
    if (filters.length === 0) {
      console.log(`[MQTT] No subscriptions configured for ${conn.profile.name} — waiting for user to add topics`)
      emit('broker:info', {
        brokerId: conn.profile.id,
        message: 'Connected. Add topic filters in the sidebar to start receiving messages.',
      })
      return
    }

    console.log(`[MQTT] Subscribing to: ${filters.join(', ')}`)
    conn.client.subscribe(filters, { qos: 0 }, (err, granted) => {
      if (err) {
        console.warn(`[MQTT] Subscribe failed: ${err.message}`)
        emit('broker:info', {
          brokerId: conn.profile.id,
          message: `Subscribe failed: ${err.message}`,
        })
      } else {
        const ok = (granted ?? []).map(g => `${g.topic}(qos${g.qos})`).join(', ')
        console.log(`[MQTT] Subscribed: ${ok}`)
        emit('broker:info', { brokerId: conn.profile.id, message: '' })
      }
    })
  }

  // Called from IPC when user adds/removes a subscription while connected
  async updateSubscriptions(
    brokerId: string,
    add: string[],
    remove: string[],
    emit: EventEmitter,
  ): Promise<{ ok: boolean; error?: string }> {
    const conn = this.connections.get(brokerId)
    if (!conn) return { ok: false, error: 'Not connected' }

    if (remove.length > 0) {
      await new Promise<void>((res) => conn.client.unsubscribe(remove, {}, () => res()))
      console.log(`[MQTT] Unsubscribed: ${remove.join(', ')}`)
    }

    if (add.length > 0) {
      return new Promise((resolve) => {
        conn.client.subscribe(add, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`[MQTT] Subscribe failed: ${err.message}`)
            emit('broker:info', { brokerId, message: `Subscribe failed: ${err.message}` })
            resolve({ ok: false, error: err.message })
          } else {
            console.log(`[MQTT] Subscribed: ${add.join(', ')}`)
            emit('broker:info', { brokerId, message: '' })
            resolve({ ok: true })
          }
        })
      })
    }
    return { ok: true }
  }

  async disconnect(brokerId: string): Promise<void> {
    const conn = this.connections.get(brokerId)
    if (!conn) return
    clearInterval(conn.pingTimer)
    clearTimeout(conn.reconnectTimer)
    // Remove from map BEFORE end() so the close handler doesn't schedule a reconnect
    this.connections.delete(brokerId)
    await new Promise<void>((resolve) => conn.client.end(true, {}, () => resolve()))
  }

  async publish(
    brokerId: string,
    topic: string,
    payload: string,
    qos: 0 | 1 | 2 = 0,
    retain = false,
  ): Promise<{ ok: boolean; error?: string }> {
    const conn = this.connections.get(brokerId)
    if (!conn) return { ok: false, error: 'Not connected' }
    return new Promise((resolve) => {
      conn.client.publish(topic, payload, { qos, retain }, (err) => {
        if (err) resolve({ ok: false, error: err.message })
        else resolve({ ok: true })
      })
    })
  }

  allStatus(): Record<string, { connected: boolean; messageCount: number; latency: number; connectedAt: number }> {
    const out: Record<string, { connected: boolean; messageCount: number; latency: number; connectedAt: number }> = {}
    for (const [id, conn] of this.connections) {
      out[id] = {
        connected: conn.client.connected,
        messageCount: conn.messageCount,
        latency: conn.latency,
        connectedAt: conn.connectedAt,
      }
    }
    return out
  }
}
