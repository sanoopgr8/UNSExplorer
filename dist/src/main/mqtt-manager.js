"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MqttManager = void 0;
const mqtt = __importStar(require("mqtt"));
const net = __importStar(require("net"));
const RECONNECT_DELAY_MS = 8000;
class MqttManager {
    constructor() {
        this.connections = new Map();
    }
    tcpReachable(host, port, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(timeoutMs);
            socket.once('connect', () => { socket.destroy(); resolve(); });
            socket.once('timeout', () => { socket.destroy(); reject(new Error(`TCP timeout — nothing listening at ${host}:${port}`)); });
            socket.once('error', (err) => { socket.destroy(); reject(new Error(`TCP error: ${err.message}`)); });
            socket.connect(port, host);
        });
    }
    async connect(profile, emit) {
        if (this.connections.has(profile.id)) {
            await this.disconnect(profile.id);
        }
        console.log(`[MQTT] Connecting to ${profile.protocol}://${profile.host}:${profile.port}`);
        if (profile.protocol === 'mqtt' || profile.protocol === 'mqtts') {
            try {
                await this.tcpReachable(profile.host, profile.port, 5000);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[MQTT] TCP pre-check failed: ${msg}`);
                return { ok: false, error: msg };
            }
        }
        return this._doConnect(profile, emit);
    }
    _doConnect(profile, emit) {
        return new Promise((resolve) => {
            const url = `${profile.protocol}://${profile.host}:${profile.port}`;
            const opts = {
                clientId: profile.clientId || `uns-explorer-${Date.now()}`,
                username: profile.username || undefined,
                password: profile.password || undefined,
                keepalive: profile.keepalive ?? 30, // 30s — well within broker limits
                connectTimeout: profile.connectTimeout ?? 8000,
                reconnectPeriod: 0, // we manage reconnect ourselves
                clean: true,
            };
            let resolved = false;
            const client = mqtt.connect(url, opts);
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.error(`[MQTT] Handshake timed out for ${url}`);
                    client.end(true);
                    resolve({ ok: false, error: 'MQTT handshake timed out' });
                }
            }, (profile.connectTimeout ?? 8000) + 2000);
            client.on('connect', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    console.log(`[MQTT] Connected to ${url}`);
                }
                const conn = {
                    client,
                    profile,
                    messageCount: 0,
                    connectedAt: Date.now(),
                    latency: 0,
                };
                this.connections.set(profile.id, conn);
                this._subscribe(conn, emit);
                emit('broker:connected', { brokerId: profile.id });
                resolve({ ok: true });
                // Use a safe non-$ topic for latency measurement.
                // MQTT keepalive (PINGREQ/PINGRESP) already keeps the connection alive —
                // we just need a lightweight publish to measure round-trip time.
                conn.pingTimer = setInterval(() => {
                    const start = Date.now();
                    const pingTopic = `uns-explorer/ping/${profile.clientId}`;
                    client.publish(pingTopic, '', { qos: 0 }, (err) => {
                        if (!err) {
                            conn.latency = Date.now() - start;
                            emit('broker:latency', { brokerId: profile.id, latency: conn.latency });
                        }
                    });
                }, 30000);
            });
            client.on('message', (topic, payload, packet) => {
                const conn = this.connections.get(profile.id);
                if (conn)
                    conn.messageCount++;
                emit('mqtt:message', {
                    brokerId: profile.id,
                    topic,
                    payload: payload.toString(),
                    qos: packet.qos,
                    retain: packet.retain,
                    timestamp: Date.now(),
                });
            });
            client.on('error', (err) => {
                console.error(`[MQTT] Error for ${url}: ${err.message}`);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    client.end(true);
                    resolve({ ok: false, error: err.message });
                }
                emit('broker:error', { brokerId: profile.id, error: err.message });
            });
            client.on('close', () => {
                const conn = this.connections.get(profile.id);
                console.log(`[MQTT] Connection closed for ${profile.id} — will reconnect in ${RECONNECT_DELAY_MS / 1000}s`);
                emit('broker:disconnected', { brokerId: profile.id });
                // Schedule reconnect if we still have this connection tracked
                if (conn) {
                    clearInterval(conn.pingTimer);
                    clearTimeout(conn.reconnectTimer);
                    conn.reconnectTimer = setTimeout(() => {
                        if (!this.connections.has(profile.id))
                            return;
                        console.log(`[MQTT] Reconnecting to ${url}...`);
                        emit('broker:reconnecting', { brokerId: profile.id });
                        this.connections.delete(profile.id);
                        this._doConnect(profile, emit);
                    }, RECONNECT_DELAY_MS);
                }
            });
        });
    }
    _subscribe(conn, emit) {
        const filters = conn.profile.subscriptions?.filter(s => s.trim()) ?? [];
        if (filters.length === 0) {
            console.log(`[MQTT] No subscriptions configured for ${conn.profile.name} — waiting for user to add topics`);
            emit('broker:info', {
                brokerId: conn.profile.id,
                message: 'Connected. Add topic filters in the sidebar to start receiving messages.',
            });
            return;
        }
        console.log(`[MQTT] Subscribing to: ${filters.join(', ')}`);
        conn.client.subscribe(filters, { qos: 0 }, (err, granted) => {
            if (err) {
                console.warn(`[MQTT] Subscribe failed: ${err.message}`);
                emit('broker:info', {
                    brokerId: conn.profile.id,
                    message: `Subscribe failed: ${err.message}`,
                });
            }
            else {
                const ok = (granted ?? []).map(g => `${g.topic}(qos${g.qos})`).join(', ');
                console.log(`[MQTT] Subscribed: ${ok}`);
                emit('broker:info', { brokerId: conn.profile.id, message: '' });
            }
        });
    }
    // Called from IPC when user adds/removes a subscription while connected
    async updateSubscriptions(brokerId, add, remove, emit) {
        const conn = this.connections.get(brokerId);
        if (!conn)
            return { ok: false, error: 'Not connected' };
        if (remove.length > 0) {
            await new Promise((res) => conn.client.unsubscribe(remove, {}, () => res()));
            console.log(`[MQTT] Unsubscribed: ${remove.join(', ')}`);
        }
        if (add.length > 0) {
            return new Promise((resolve) => {
                conn.client.subscribe(add, { qos: 0 }, (err) => {
                    if (err) {
                        console.warn(`[MQTT] Subscribe failed: ${err.message}`);
                        emit('broker:info', { brokerId, message: `Subscribe failed: ${err.message}` });
                        resolve({ ok: false, error: err.message });
                    }
                    else {
                        console.log(`[MQTT] Subscribed: ${add.join(', ')}`);
                        emit('broker:info', { brokerId, message: '' });
                        resolve({ ok: true });
                    }
                });
            });
        }
        return { ok: true };
    }
    async disconnect(brokerId) {
        const conn = this.connections.get(brokerId);
        if (!conn)
            return;
        clearInterval(conn.pingTimer);
        clearTimeout(conn.reconnectTimer);
        // Remove from map BEFORE end() so the close handler doesn't schedule a reconnect
        this.connections.delete(brokerId);
        await new Promise((resolve) => conn.client.end(true, {}, () => resolve()));
    }
    async publish(brokerId, topic, payload, qos = 0, retain = false, emit) {
        const conn = this.connections.get(brokerId);
        if (!conn)
            return { ok: false, error: 'Not connected' };
        return new Promise((resolve) => {
            conn.client.publish(topic, payload, { qos, retain }, (err) => {
                if (err) {
                    resolve({ ok: false, error: err.message });
                }
                else {
                    // Echo the published message to the renderer so it always appears
                    // in the topic tree even if the broker doesn't route it back
                    emit?.('mqtt:message', {
                        brokerId,
                        topic,
                        payload,
                        qos,
                        retain,
                        timestamp: Date.now(),
                    });
                    resolve({ ok: true });
                }
            });
        });
    }
    allStatus() {
        const out = {};
        for (const [id, conn] of this.connections) {
            out[id] = {
                connected: conn.client.connected,
                messageCount: conn.messageCount,
                latency: conn.latency,
                connectedAt: conn.connectedAt,
            };
        }
        return out;
    }
}
exports.MqttManager = MqttManager;
