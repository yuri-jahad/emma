import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

export function getIdHandler ({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse | string[] {
  const guard = clientGuard(bot, message.author.id, ['admin'])
  if (!guard.success) return guard

  const targetUsername = args[1]
  if (!targetUsername) {
    return {
      success: false,
      msg: 'Syntaxe invalide. Utilisation : .id <pseudo>'
    }
  }

  const userIds = bot.users.getIdByName(targetUsername)

  if (!userIds || userIds.length === 0) {
    return {
      success: false,
      msg: `Aucun utilisateur nommé ${targetUsername} n'a été trouvé.`
    }
  }

  const CYAN    = ANSI_COLORS.cyan
  const BLUE    = ANSI_COLORS.blue
  const RESET   = '\u001b[0m'

  const header  = `${CYAN}IDENTIFIANT(S) TROUVÉ(S)${RESET}\n`
  const info    = `${BLUE}Cible : "${targetUsername}" | Résultats : ${userIds.length}${RESET}\n\n`
  const idLines = userIds.map(id => `${CYAN}• ${id}${RESET}`).join('\n')

  return [`\`\`\`ansi\n${(header + info + idLines).trimEnd()}\n\`\`\``]
}
