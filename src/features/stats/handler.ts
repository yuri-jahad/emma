import type { CommandResponse, CommandContext } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

function winRate (wins: number, played: number): string {
  if (played === 0) return '—'
  return `${Math.round((wins / played) * 100)}%`
}

export async function statsHandler ({
  args,
  message,
  bot,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  // Resolve target: @mention, username, or self
  let targetUser = bot.users.getUser(message.author.id)

  const targetArg = args[1]
  if (targetArg) {
    const mentioned = message.mentions.users.first()
    if (mentioned) {
      targetUser = bot.users.getUser(mentioned.id)
    } else {
      const ids = bot.users.getIdByName(targetArg)
      if (ids.length > 0) targetUser = bot.users.getUser(ids[0]!)
    }
  }

  if (!targetUser) {
    return { success: false, msg: 'Utilisateur introuvable dans la base du bot.' }
  }

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  const listSize = targetUser.list.length
  const played   = targetUser.defGame?.played ?? 0
  const wins     = targetUser.defGame?.wins   ?? 0

  const roleColor = targetUser.role === 'user' ? BLUE : CYAN

  let out = `${CYAN}[ PROFIL · ${targetUser.username.toUpperCase()} ]${RESET}\n`
  out += `${SEP}\n`
  out += `${BLUE}Rôle${RESET} : ${roleColor}${targetUser.role.toUpperCase()}${RESET}\n`
  out += `${SEP}\n\n`

  // Liste personnelle
  out += `${CYAN}◆ LISTE PERSONNELLE${RESET}\n`
  out += `  ${BLUE}Mots${RESET} : ${CYAN}${listSize}${RESET}\n`
  if (listSize > 0) {
    const preview = targetUser.list.slice(0, 5).join(', ')
    const more    = listSize > 5 ? ` +${listSize - 5}` : ''
    out += `  ${BLUE}Aperçu${RESET} : ${preview}${more}\n`
  }
  out += '\n'

  // Jeu de définitions
  out += `${CYAN}◆ JEU DE DÉFINITIONS${RESET}\n`
  out += `  ${BLUE}Parties${RESET}  : ${CYAN}${played}${RESET}\n`
  out += `  ${BLUE}Victoires${RESET}: ${CYAN}${wins}${RESET}\n`
  out += `  ${BLUE}Win rate${RESET} : ${winRate(wins, played)}\n`

  return [`\`\`\`ansi\n${out.trimEnd()}\n\`\`\``]
}
