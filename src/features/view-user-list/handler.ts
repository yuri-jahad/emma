import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'
import { shuffle, searchWords } from '@shared/utils/array'

export function viewUserListHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse | string[] {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  const targetUsername = args[1]
  if (!targetUsername) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple : ".vl pseudo"'
    }
  }

  const userIds = bot.users.getIdByName(targetUsername)

  if (!userIds || userIds.length === 0) {
    return {
      success: false,
      msg: `Aucun utilisateur nommé "${targetUsername}" n'a été trouvé.`
    }
  }

  if (userIds.length > 1) {
    return {
      success: false,
      msg: `Plusieurs utilisateurs correspondent à "${targetUsername}". Soyez plus précis.`
    }
  }

  const user = bot.users.getUser(userIds[0]!)
  if (!user) {
    return {
      success: false,
      msg: `Impossible de récupérer le profil de "${targetUsername}".`
    }
  }

  const { list, username, role } = user

  if (!list || list.length === 0) {
    return {
      success: false,
      msg: `La liste de ${username} est actuellement vide.`
    }
  }

  const pattern = args[2] || ''
  const hasPattern = pattern.trim().length > 0

  const CYAN = ANSI_COLORS.cyan
  const BLUE = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  let displayWords: string[]
  let total: number

  if (hasPattern) {
    const result = searchWords(pattern, list, 10)
    displayWords = result.results
    total = result.total
  } else {
    displayWords = shuffle([...list]).slice(0, 20)
    total = list.length
  }

  if (hasPattern && displayWords.length === 0) {
    return {
      success: false,
      msg: `Aucun mot correspondant à "${pattern}" dans la liste de ${username}.`
    }
  }

  const highlightRegex = hasPattern ? new RegExp(pattern, 'gi') : null
  const coloredWords = hasPattern
    ? displayWords.map(word =>
        `${BLUE}${word.replace(highlightRegex!, match => `${RESET}${CYAN}${match}${RESET}${BLUE}`)}${RESET}`
      )
    : displayWords.map(w => `${BLUE}${w}${RESET}`)

  const headerTitle = hasPattern
    ? `${CYAN}RECHERCHE : ${pattern.toUpperCase()}${RESET}`
    : `${CYAN}APERÇU DE LA LISTE${RESET}`

  const headerBlock = `${BLUE}[${role.toUpperCase()}]${RESET} ${CYAN}${username.toUpperCase()}${RESET}\n`
    + `${headerTitle}\n`
    + `${BLUE}${total} mot(s) au total | ${displayWords.length} affiché(s)${RESET}\n\n`

  const singleContent = headerBlock + coloredWords.join(' ')
  if (fitsInMessage(`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``)) {
    return [`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``]
  }

  const rows: string[] = []
  for (let i = 0; i < coloredWords.length; i += 10) {
    rows.push(coloredWords.slice(i, i + 10).join(' '))
  }

  const messages: string[] = []
  let currentContent = headerBlock + (rows[0] ?? '')

  for (let i = 1; i < rows.length; i++) {
    const candidate = currentContent + '\n' + rows[i]
    if (!fitsInMessage(`\`\`\`ansi\n${candidate.trimEnd()}\n\`\`\``)) {
      messages.push(`\`\`\`ansi\n${currentContent.trimEnd()}\n\`\`\``)
      currentContent = rows[i] ?? ''
    } else {
      currentContent = candidate
    }
  }

  if (currentContent.trim()) {
    messages.push(`\`\`\`ansi\n${currentContent.trimEnd()}\n\`\`\``)
  }

  return messages
}
