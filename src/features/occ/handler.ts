import { words } from '@core/dictionary/cache'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { processSyllables } from '@features/occ/service'
import { shuffle } from '@shared/utils/array'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

export function occHandler ({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse | string[] {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success) {
    return guard
  }

  const rawMode = args[0] || ''
  const mode = rawMode.replace(/^[.\/]/, '')

  const params = args.slice(1)
  let val1Str: string | undefined
  let val2Str: string | undefined
  const DEFAULT_LIMIT = 20
  const MAX_LIMIT = 50
  let limit = DEFAULT_LIMIT

  const user = bot.users.getUser(message.author.id)
  const isElevated = user?.role === 'admin' || user?.role === 'owner'

  for (const p of params) {
    if (p.toLowerCase().startsWith('l')) {
      if (isElevated) {
        const parsedLimit = parseInt(p.slice(1), 10)
        if (!isNaN(parsedLimit)) limit = Math.min(parsedLimit, MAX_LIMIT)
      }
    } else {
      if (!val1Str) val1Str = p
      else if (!val2Str) val2Str = p
    }
  }

  if (!val1Str) {
    return {
      success: false,
      msg: `Utilisation invalide. Exemple : ".${mode} 3" ou ".${mode} 3 900${isElevated ? ' l50' : ''}".`
    }
  }

  const val1 = parseInt(val1Str, 10)
  if (isNaN(val1)) {
    return {
      success: false,
      msg: `La valeur "${val1Str}" n'est pas un nombre valide.`
    }
  }

  const val2 = val2Str ? parseInt(val2Str, 10) : undefined

  try {
    const dictionary = words
    if (!dictionary || !dictionary.success) {
      return {
        success: false,
        msg: 'Le dictionnaire est actuellement indisponible.'
      }
    }

    const serviceArgs = [mode, val1.toString()]
    if (val2 !== undefined && !isNaN(val2)) serviceArgs.push(val2.toString())

    const resultMap = processSyllables(serviceArgs)

    if (resultMap.size === 0) {
      return {
        success: false,
        msg: `Je n'ai trouvé aucune syllabe correspondant aux critères.`
      }
    }

    const allEntries = Array.from(resultMap.entries())
    const selectedEntries = shuffle(allEntries).slice(0, limit)

    const summary = `${ANSI_COLORS.blue}${allEntries.length} syllabes trouvées (Affichage de ${selectedEntries.length} entrées)\u001b[0m\n\n`
    const lines: string[] = []

    const CYAN  = ANSI_COLORS.cyan
    const BLUE  = ANSI_COLORS.blue
    const RESET = `\u001b[0m`

    for (const [syl, wordsSet] of selectedEntries) {
      const sylUpper = syl.toUpperCase()
      const sylLabel = `${CYAN}${sylUpper}${RESET}`

      const wordsArr = Array.from(wordsSet)
      const wordsToShow = wordsArr.slice(0, 8)
      const ellipsis = wordsArr.length > 8 ? '...' : ''

      const highlightedWords = wordsToShow.map(word => {
        const wordUpper = word.toUpperCase()
        const idx = wordUpper.indexOf(sylUpper)
        if (idx === -1) return `${BLUE}${wordUpper}${RESET}`
        return (
          `${BLUE}${wordUpper.slice(0, idx)}${RESET}` +
          `${CYAN}${sylUpper}${RESET}` +
          `${BLUE}${wordUpper.slice(idx + sylUpper.length)}${RESET}`
        )
      })

      lines.push(`${sylLabel} : [${highlightedWords.join(' ')}]${ellipsis}`)
    }

    const messages: string[] = []
    let currentLines: string[] = []

    for (const line of lines) {
      const content = (messages.length === 0 ? summary : '') + [...currentLines, line].join('\n')
      const candidateMsg = `\`\`\`ansi\n${content}\n\`\`\``
      if (!fitsInMessage(candidateMsg) && currentLines.length > 0) {
        const flushedContent = (messages.length === 0 ? summary : '') + currentLines.join('\n')
        messages.push(`\`\`\`ansi\n${flushedContent}\n\`\`\``)
        currentLines = [line]
      } else {
        currentLines.push(line)
      }
    }

    if (currentLines.length > 0) {
      const content = (messages.length === 0 ? summary : '') + currentLines.join('\n')
      messages.push(`\`\`\`ansi\n${content}\n\`\`\``)
    }

    return messages
  } catch (error) {
    console.error(`[OccHandler] Erreur avec ${mode} ${val1Str}:`, error)
    return {
      success: false,
      msg: `Une erreur interne s'est produite lors du traitement.`
    }
  }
}