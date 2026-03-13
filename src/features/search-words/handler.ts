import { words } from '@core/dictionary/cache'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { searchWords } from '@shared/utils/array'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

export function searchWordsHandler ({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse | string[] {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success) {
    return guard
  }
  const pattern = args[1] || ''

  if (!pattern) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple correct : ".c maison".'
    }
  }

  const DEFAULT_LIMIT = 10
  const user = bot.users.getUser(message.author.id)
  const isElevated = user?.role === 'admin' || user?.role === 'owner'

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

    const { results, total } = searchWords(
      pattern,
      dictionary.data.words,
      limit
    )

    if (total === 0) {
      return {
        success: false,
        msg: `Je n'ai trouvé aucun mot correspondant au motif "${pattern}".`
      }
    }

    const CYAN = ANSI_COLORS.cyan
    const BLUE = ANSI_COLORS.blue
    const RESET = '\u001b[0m'

    const highlightRegex = new RegExp(pattern, 'gi')
    const highlightedWords = results.map(word =>
      `${BLUE}${word.replace(highlightRegex, match => `${RESET}${CYAN}${match}${RESET}${BLUE}`)}${RESET}`
    )

    const patternLabel = `${CYAN}${pattern.toUpperCase()}${RESET}`
    const header = `${BLUE}${total} ${total > 1 ? 'résultats trouvés -' : 'résultat trouvé -'} ${results.length} affiché(s)${RESET}\n\n`

    const singleContent = header + `${patternLabel} : [${highlightedWords.join(' ')}]`
    if (fitsInMessage(`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``)) {
      return [`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``]
    }

    const rows: string[] = []
    for (let i = 0; i < highlightedWords.length; i += 10) {
      rows.push(highlightedWords.slice(i, i + 10).join(' '))
    }

    const messages: string[] = []
    let currentContent = header + `${patternLabel} :\n` + (rows[0] ?? '')

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
