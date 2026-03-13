import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

export async function unmuteHandler ({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['admin'])

  if (!guard.success) {
    return guard
  }

  const targetId = args[1]

  if (!targetId) {
    return {
      success: false,
      msg: 'Syntaxe invalide. Utilisation requise : .unmute <id>'
    }
  }

  const targetUser = bot.users.getUser(targetId)

  if (!targetUser) {
    return {
      success: false,
      msg: `L'identifiant fourni (${targetId}) ne correspond à aucun utilisateur enregistré.`
    }
  }

  const CYAN    = ANSI_COLORS.cyan
  const BLUE    = ANSI_COLORS.blue
  const RESET   = '\u001b[0m'

  if (!targetUser.muted) {
    const header = `${CYAN}DÉJÀ ACTIF${RESET}\n`
    const info   = `${BLUE}Utilisateur : ${CYAN}${targetUser.username}${RESET} ${BLUE}| Statut : ${CYAN}ACTIF${RESET}`
    return [`\`\`\`ansi\n${header}\n${info}\n\`\`\``]
  }

  await bot.users.setMuteState(targetId, false)

  const header = `${CYAN}DROITS RÉTABLIS${RESET}\n`
  const info   = `${BLUE}Utilisateur : ${CYAN}${targetUser.username}${RESET} ${BLUE}| Statut : ${CYAN}ACTIF${RESET}`
  return [`\`\`\`ansi\n${header}\n${info}\n\`\`\``]
}
