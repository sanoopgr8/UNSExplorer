type EventEmitter = (event: string, data: unknown) => void;
export interface BrokerProfile {
    id: string;
    name: string;
    host: string;
    port: number;
    protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
    username?: string;
    password?: string;
    clientId: string;
    color: string;
    keepalive?: number;
    connectTimeout?: number;
    subscriptions: string[];
}
export declare class MqttManager {
    private connections;
    private tcpReachable;
    connect(profile: BrokerProfile, emit: EventEmitter): Promise<{
        ok: boolean;
        error?: string;
    }>;
    private _doConnect;
    private _subscribe;
    updateSubscriptions(brokerId: string, add: string[], remove: string[], emit: EventEmitter): Promise<{
        ok: boolean;
        error?: string;
    }>;
    disconnect(brokerId: string): Promise<void>;
    publish(brokerId: string, topic: string, payload: string, qos?: 0 | 1 | 2, retain?: boolean): Promise<{
        ok: boolean;
        error?: string;
    }>;
    allStatus(): Record<string, {
        connected: boolean;
        messageCount: number;
        latency: number;
        connectedAt: number;
    }>;
}
export {};
