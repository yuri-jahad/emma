import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

export async function muteHandler({
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
      msg: 'Syntaxe invalide. Utilisation requise : .mute <id>'
    }
  }

  if (targetId === message.author.id) {
    return {
      success: false,
      msg: 'Action impossible : Vous ne pouvez pas appliquer de restriction sur votre propre compte.'
    }
  }

  const targetUser = bot.users.getUser(targetId)

  if (!targetUser) {
    return {
      success: false,
      msg: `L'identifiant fourni (${targetId}) ne correspond à aucun utilisateur enregistré.`
    }
  }

  if (targetUser.role === 'owner') {
    return {
      success: false,
      msg: 'Action impossible : La suspension des droits du propriétaire est interdite par le système.'
    }
  }

  const CYAN    = ANSI_COLORS.cyan
  const BLUE    = ANSI_COLORS.blue
  const RESET   = '\u001b[0m'

  if (targetUser.muted) {
    const header = `${CYAN}DÉJÀ SUSPENDU${RESET}\n`
    const info   = `${BLUE}Utilisateur : ${CYAN}${targetUser.username}${RESET} ${BLUE}| Statut : ${CYAN}SUSPENDU${RESET}`
    return [`\`\`\`ansi\n${header}\n${info}\n\`\`\``]
  }

  await bot.users.setMuteState(targetId, true)

  const header = `${CYAN}RESTRICTION APPLIQUÉE${RESET}\n`
  const info   = `${BLUE}Utilisateur : ${CYAN}${targetUser.username}${RESET} ${BLUE}| Statut : ${CYAN}SUSPENDU${RESET}`
  return [`\`\`\`ansi\n${header}\n${info}\n\`\`\``]
}
