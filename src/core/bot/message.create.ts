import type { Message } from 'discord.js'
import { PhantaminumBot } from '@core/bot/phantaminum-bot'
import { sleep } from 'bun'
import { createUserFromMessage } from '@shared/user/service'
import { reformatTextService } from '@shared/utils/text'
import { guildGuard } from '@shared/guild/guard'
import { sessions } from '@features/def-game/session'

export const handleMessageCreate = async (
  message: Message,
  bot: PhantaminumBot
): Promise<void> => {
  if (message.author.bot) return

  const hasActiveGame = sessions.has(message.channelId)
  const isAuthorizedContext = hasActiveGame || guildGuard(message, bot)
  if (!isAuthorizedContext) return

  const currentUser = bot.users.getUser(message.author.id)

  if (currentUser?.muted && message.content.startsWith('.')) {
    const formattedMessages = reformatTextService('mute', {
      success: false,
      msg: `Action impossible : ${currentUser.username}, vos droits d'interaction avec le bot ont été suspendus.`
    })
    if (message.channel.isSendable()) await message.channel.send(formattedMessages[0] || '')
    return
  }

  const commandFnContent = await bot.commands.deployCommands(message, bot)

  if (!commandFnContent || commandFnContent.length === 0) return

  if (!currentUser) {
    const user = createUserFromMessage(message)
    await bot.users.addUser(user)
  }

  if (!message.channel.isSendable()) return

  try {
    await message.channel.sendTyping()
  } catch {}

  for (let i = 0; i < commandFnContent.length; i++) {
    await message.channel.send(commandFnContent[i] || '')
    if (i < commandFnContent.length - 1) {
      await sleep(1000)
    }
  }
}
