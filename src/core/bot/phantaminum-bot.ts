import { CommandService } from '@shared/command/service'
import { DiscordClient } from '@shared/discord/client'
import { UsersService } from '@shared/users/service'
import { handleMessageCreate } from './message.create'
import { GuildService } from '@shared/guild/service'
import { QuranService } from '@features/get-surah/service'

export class PhantaminumBot {
  client: DiscordClient = DiscordClient.getInstance()
  users: UsersService = UsersService.getInstance()
  commands: CommandService = CommandService.getInstance()
  guilds: GuildService = GuildService.getInstance()
  quran: QuranService = QuranService.getInstance()

  async initializeBot () {
    await this.users.load()
    await this.quran.initializeCoran()
    await this.commands.initializeCommands()
    const client = await this.client.start()
    client?.on(
      'messageCreate',
      async message => await handleMessageCreate(message, this)
    )
  }
}
