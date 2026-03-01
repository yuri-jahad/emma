import { DataService } from '@data/service'
import { join } from 'path'

export class GuildService {
  private static instance: GuildService | null = null
  readonly guilds: Map<string, Set<string>> = new Map()
  readonly dataService: DataService = DataService.getInstance()
  readonly path = join(import.meta.dir, '..', '..', 'data/guilds.json')

  private constructor () {}

  static getInstance (): GuildService {
    if (!GuildService.instance) {
      GuildService.instance = new GuildService()
    }
    return GuildService.instance
  }

  async initializeGuilds (): Promise<void> {
    const guildContent = await this.dataService.loadData(this.path)

    if (!guildContent || Object.keys(guildContent).length === 0) {
      await this.dataService.saveData(this.path, {})
      return
    }

    for (const [guildId, dataArray] of Object.entries(guildContent)) {
      this.guilds.set(guildId, new Set(dataArray as string[]))
    }
  }

  async addGuild (guildId: string): Promise<boolean> {
    if (!this.guilds.has(guildId)) {
      this.guilds.set(guildId, new Set())
      await this.saveGuilds()
      return true
    }
    return false
  }

  async deleteGuild (guildId: string): Promise<boolean> {
    if (this.guilds.has(guildId)) {
      this.guilds.delete(guildId)
      await this.saveGuilds()
      return true
    }
    return false
  }

  async addChannel (guildId: string, channelId: string): Promise<boolean> {
    if (!this.guilds.has(guildId)) {
      this.guilds.set(guildId, new Set())
    }

    const guild = this.guilds.get(guildId)!
    if (guild.has(channelId)) {
      return false
    }

    guild.add(channelId)
    await this.saveGuilds()
    return true
  }

  get Guilds () {
    return this.guilds
  }

  async deleteChannel (guildId: string, channelId: string): Promise<boolean> {
    const guild = this.guilds.get(guildId)
    if (!guild || !guild.has(channelId)) {
      return false
    }

    guild.delete(channelId)
    await this.saveGuilds()
    return true
  }

  private async saveGuilds (): Promise<void> {
    const jsonReadyObject: Record<string, string[]> = {}

    for (const [guildId, dataSet] of this.guilds.entries()) {
      jsonReadyObject[guildId] = Array.from(dataSet)
    }

    await this.dataService.saveData(this.path, jsonReadyObject)
  }
}
