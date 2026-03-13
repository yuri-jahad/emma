import { words } from '@core/dictionary/cache'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { searchWords, shuffle } from '@shared/utils/array'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

export function myListSearchWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse | string[] {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success) {
    return guard
  }

  const user = bot.users.getUser(message.author.id)
  if (!user) {
    return {
      success: false,
      msg: "Une erreur s'est produite lors de la récupération de votre profil."
    }
  }

  const { list, username, role } = user

  if (!list || list.length === 0) {
    return {
      success: false,
      msg: `${username}, votre liste personnelle est actuellement vide.`
    }
  }

  const pattern = args[1] || ''
  const hasPattern = pattern.trim().length > 0

  const DEFAULT_LIMIT = hasPattern ? 10 : 20
  const isElevated = role === 'admin' || role === 'owner'

  let limit = DEFAULT_LIMIT
  if (isElevated && args[2]) {
    const parsed = parseInt(args[2], 10)
    if (isNaN(parsed)) {
      return {
        success: false,
        msg: `La limite "${args[2]}" n'est pas un nombre valide.`
      }
    }
    limit = parsed
  }

  try {
    const dictionary = words
    if (!dictionary.success) {
      return {
        success: false,
        msg: 'Le dictionnaire est actuellement indisponible. Veuillez réessayer plus tard.'
      }
    }

    const arrayToSearch = hasPattern ? list : shuffle([...list])
    const { results, total } = searchWords(pattern, arrayToSearch, limit)

    if (total === 0) {
      return {
        success: false,
        msg: hasPattern
          ? `${username}, je n'ai trouvé aucun mot correspondant au motif "${pattern}" dans votre liste.`
          : 'Votre liste ne contient aucun mot valide à afficher.'
      }
    }

    const CYAN = ANSI_COLORS.cyan
    const BLUE = ANSI_COLORS.blue
    const RESET = '\u001b[0m'

    const plurielMot = total > 1 ? 'mots' : 'mot'
    const headerTitle = hasPattern ? `${CYAN}RECHERCHE : ${pattern.toUpperCase()}${RESET}` : `${CYAN}APERÇU DE LA LISTE${RESET}`

    const headerBlock = `${BLUE}[${role.toUpperCase()}]${RESET} ${CYAN}${username.toUpperCase()}${RESET}\n`
      + `${headerTitle}\n`
      + `${BLUE}${total} ${plurielMot} au total | ${results.length} affiché(s)${RESET}\n\n`

    const highlightRegex = hasPattern ? new RegExp(pattern, 'gi') : null
    const coloredWords = hasPattern
      ? results.map(word =>
          `${BLUE}${word.replace(highlightRegex!, match => `${RESET}${CYAN}${match}${RESET}${BLUE}`)}${RESET}`
        )
      : results.map(w => `${BLUE}${w}${RESET}`)

    const patternLabel = hasPattern ? `${CYAN}${pattern.toUpperCase()}${RESET}` : null

    const singleBody = patternLabel
      ? `${patternLabel} : [${coloredWords.join(' ')}]`
      : coloredWords.join(' ')
    const singleContent = headerBlock + singleBody
    if (fitsInMessage(`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``)) {
      return [`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``]
    }

    const rows: string[] = []
    for (let i = 0; i < coloredWords.length; i += 10) {
      rows.push(coloredWords.slice(i, i + 10).join(' '))
    }

    const messages: string[] = []
    const firstHeader = headerBlock + (patternLabel ? `${patternLabel} :\n` : '')
    let currentContent = firstHeader + (rows[0] ?? '')

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
  } catch (error) {
    console.error(
      `[SearchWords] Erreur critique avec le motif "${pattern}":`,
      error
    )

    if (error instanceof SyntaxError) {
      return {
        success: false,
        msg: `Le motif "${pattern}" est invalide (caractères spéciaux non supportés ou expression régulière erronée).`
      }
    }

    return {
      success: false,
      msg: `Une erreur interne s'est produite lors de la recherche du motif "${pattern}".`
    }
  }
}
