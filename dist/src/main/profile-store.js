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
exports.ProfileStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class ProfileStore {
    constructor() {
        const dir = electron_1.app.getPath('userData');
        this.filePath = path.join(dir, 'broker-profiles.json');
    }
    list() {
        try {
            if (!fs.existsSync(this.filePath))
                return [];
            return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        }
        catch {
            return [];
        }
    }
    save(profile) {
        const profiles = this.list();
        const idx = profiles.findIndex((p) => p.id === profile.id);
        if (idx >= 0)
            profiles[idx] = profile;
        else
            profiles.push(profile);
        fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2));
        return profiles;
    }
    delete(id) {
        const profiles = this.list().filter((p) => p.id !== id);
        fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2));
        return profiles;
    }
}
exports.ProfileStore = ProfileStore;
