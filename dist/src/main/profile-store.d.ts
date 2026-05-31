import type { BrokerProfile } from './mqtt-manager';
export declare class ProfileStore {
    private filePath;
    constructor();
    list(): BrokerProfile[];
    save(profile: BrokerProfile): BrokerProfile[];
    delete(id: string): BrokerProfile[];
}
