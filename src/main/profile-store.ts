import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { BrokerProfile } from './mqtt-manager'

export class ProfileStore {
  private filePath: string

  constructor() {
    const dir = app.getPath('userData')
    this.filePath = path.join(dir, 'broker-profiles.json')
  }

  list(): BrokerProfile[] {
    try {
      if (!fs.existsSync(this.filePath)) return []
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as BrokerProfile[]
    } catch {
      return []
    }
  }

  save(profile: BrokerProfile): BrokerProfile[] {
    const profiles = this.list()
    const idx = profiles.findIndex((p) => p.id === profile.id)
    if (idx >= 0) profiles[idx] = profile
    else profiles.push(profile)
    fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2))
    return profiles
  }

  delete(id: string): BrokerProfile[] {
    const profiles = this.list().filter((p) => p.id !== id)
    fs.writeFileSync(this.filePath, JSON.stringify(profiles, null, 2))
    return profiles
  }
}
