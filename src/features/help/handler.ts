import { CommandService } from '@shared/command/service'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import type { Message } from 'discord.js'

export async function helpHandler ({
  message
}: CommandContext): Promise<CommandResponse> {
  try {
    const commandService = CommandService.getInstance()
    const allCommandsMap = commandService.commands

    const uniqueCommands = new Set(allCommandsMap.values())

    let helpMsg = `\`\`\`yaml\n`
    helpMsg += `# =========================================\n`
    helpMsg += `# SYSTEME D'ASSISTANCE DU BOT\n`
    helpMsg += `# =========================================\n\n`

    for (const cmd of uniqueCommands) {
      if (cmd.variants && cmd.variants.length > 0) {
        const mainCommand = cmd.variants[0]
        const aliases = cmd.variants.slice(1)
        const aliasText =
          aliases.length > 0 ? ` [Alias: ${aliases.join(', ')}]` : ''

        const helperText = cmd.helper || 'Aucune description fournie.'

        helpMsg += `🔹 .${mainCommand}${aliasText}\n`
        helpMsg += `   - ${helperText}\n\n`
      }
    }

    helpMsg += `\`\`\``

    if (message.channel.isSendable()) {
      await message.channel.send(helpMsg)
    } else {
      await message.reply(helpMsg)
    }

    return {
      success: true,
      msg: ''
    }
  } catch (error) {
    console.error(`[HelpHandler] Erreur de generation:`, error)
    return {
      success: false,
      msg: "Erreur lors de la generation du menu d'aide."
    }
  }
}
