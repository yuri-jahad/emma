import type { Message } from 'discord.js'
import { PhantaminumBot } from '@core/bot/phantaminum-bot'
import { sleep } from 'bun'
import { createUserFromMessage } from '@shared/user/service'
import { reformatTextService } from '@shared/utils/text'

export const handleMessageCreate = async (
  message: Message,
  bot: PhantaminumBot
): Promise<void> => {
  if (message.author.bot) return

  const currentUser = bot.users.getUser(message.author.id)

  if (currentUser?.muted && message.content.startsWith('.')) {
    const formattedMessages = reformatTextService('', {
      success: false,
      msg: `Action impossible : ${currentUser.username}, vos droits d'interaction avec le bot ont été suspendus.`
    })

    await message.reply(formattedMessages[0] || '')
    return
  }

  const commandFnContent = await bot.commands.deployCommands(message, bot)

  if (!commandFnContent || commandFnContent.length === 0) return

  if (!currentUser) {
    const user = createUserFromMessage(message)
    await bot.users.addUser(user)
  }

  if (message.channel.isSendable()) {
    try {
      await message.channel.sendTyping()
    } catch {}
  }

  for (let i = 0; i < commandFnContent.length; i++) {
    await message.reply(commandFnContent[i] || '')
    if (i < commandFnContent.length - 1) {
      await sleep(1000)
    }
  }
}
