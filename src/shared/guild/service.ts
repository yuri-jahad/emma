import { DataService } from '@data/service'
import { join } from 'path'

export interface GuildData {
  name: string
  channels: Set<string>
}

export interface GuildJsonData {
  name: string
  channels: string[]
}

export class GuildService {
  private static instance: GuildService | null = null
  private readonly _guilds: Map<string, GuildData> = new Map()
  private readonly dataService: DataService = DataService.getInstance()
  private readonly path = join(import.meta.dir, '..', '..', 'data/guilds.json')

  private constructor() {}

  static getInstance(): GuildService {
    if (!GuildService.instance) {
      GuildService.instance = new GuildService()
    }
    return GuildService.instance
  }

  async initializeGuilds(): Promise<void> {
    const guildContent = await this.dataService.loadData(this.path) as Record<string, GuildJsonData> | null

    if (!guildContent || Object.keys(guildContent).length === 0) {
      await this.dataService.saveData(this.path, {})
      return
    }

    for (const [guildId, data] of Object.entries(guildContent)) {
      this._guilds.set(guildId, {
        name: data.name,
        channels: new Set(data.channels)
      })
    }
  }

  get guilds() {
    return this._guilds
  }

  hasChannel(guildId: string, channelId: string): boolean {
    const guild = this._guilds.get(guildId)
    return guild?.channels.has(channelId) ?? false
  }

  async addGuild(guildId: string, guildName: string): Promise<boolean> {
    if (!this._guilds.has(guildId)) {
      this._guilds.set(guildId, {
        name: guildName,
        channels: new Set()
      })
      await this.saveGuilds()
      return true
    }
    
    const guild = this._guilds.get(guildId)!
    if (guild.name !== guildName) {
      guild.name = guildName
      await this.saveGuilds()
    }
    
    return false
  }

  async deleteGuild(guildId: string): Promise<boolean> {
    if (this._guilds.has(guildId)) {
      this._guilds.delete(guildId)
      await this.saveGuilds()
      return true
    }
    return false
  }

  async addChannel(guildId: string, guildName: string, channelId: string): Promise<boolean> {
    if (!this._guilds.has(guildId)) {
      this._guilds.set(guildId, {
        name: guildName,
        channels: new Set()
      })
    }

    const guild = this._guilds.get(guildId)!
        if (guild.name !== guildName) {
      guild.name = guildName
    }

    if (guild.channels.has(channelId)) {
      await this.saveGuilds() 
      return false
    }

    guild.channels.add(channelId)
    await this.saveGuilds()
    return true
  }

  async deleteChannel(guildId: string, channelId: string): Promise<boolean> {
    const guild = this._guilds.get(guildId)
    if (!guild || !guild.channels.has(channelId)) {
      return false
    }

    guild.channels.delete(channelId)
    await this.saveGuilds()
    return true
  }

  private async saveGuilds(): Promise<void> {
    const jsonReadyObject: Record<string, GuildJsonData> = {}
    for (const [guildId, data] of this._guilds.entries()) {
      jsonReadyObject[guildId] = {
        name: data.name,
        channels: Array.from(data.channels)
      }
    }

    await this.dataService.saveData(this.path, jsonReadyObject)
  }
}
