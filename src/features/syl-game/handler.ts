import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'
import { sessions, clearSession } from '@features/def-game/session'
import type { SendableChannel } from '@features/def-game/session'
import { words } from '@core/dictionary/cache'
import { shuffle } from '@shared/utils/array'

const dictionarySet = new Set(words.data.words.map(w => cleanAccents(w.toLowerCase())))

export async function sylGameHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  const channelId = message.channelId
  if (sessions.has(channelId)) {
    return {
      success: false,
      msg: "Une partie est déjà en cours dans ce salon. Utilise `.rep <mot>` pour répondre !"
    }
  }

  const starterId = message.author.id

  const arg1 = args[1]
  const targetCount = arg1 ? parseInt(arg1, 10) : undefined

  if (arg1 && (isNaN(targetCount!) || targetCount! < 1)) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple : `.sg 3` (syllabe avec 3 solutions dans le dictionnaire).'
    }
  }

  const occurrences = words.data.occurrences
  const candidates: string[] = []

  for (const [syl, count] of Object.entries(occurrences)) {
    if (targetCount !== undefined ? count === targetCount : count >= 1) {
      candidates.push(syl)
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      msg: `Aucune syllabe trouvée avec ${targetCount} solution${targetCount! > 1 ? 's' : ''} dans le dictionnaire.`
    }
  }

  const syllable = shuffle(candidates)[0]!
  const solutionCount = occurrences[syllable] ?? 0

  const CYAN = ANSI_COLORS.cyan
  const BLUE = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const questionContent =
    `${CYAN}[ JEU DE SYLLABES ]${RESET}\n\n` +
    `${BLUE}Syllabe :${RESET} ${CYAN}${syllable.toUpperCase()}${RESET}\n\n` +
    `${CYAN}${solutionCount} mot${solutionCount > 1 ? 's' : ''} du dictionnaire contien${solutionCount > 1 ? 'nent' : 't'} cette syllabe.\n` +
    `Réponds avec \`.rep <mot>\` — 30 secondes !${RESET}`

  const channel = message.channel as SendableChannel

  const hintTimer = setTimeout(async () => {
    if (!sessions.has(channelId)) return
    const examples = words.data.words
      .filter(w => cleanAccents(w.toLowerCase()).includes(syllable))
      .slice(0, 1)
    const hintWord = examples[0]
    const hintContent = hintWord
      ? `${CYAN}[ INDICE ]${RESET}\n\n` +
        `${BLUE}Un mot valide fait${RESET} ${CYAN}${hintWord.length} lettre${hintWord.length > 1 ? 's' : ''}${RESET} ` +
        `${BLUE}et commence par${RESET} ${CYAN}${hintWord[0]!.toUpperCase()}${RESET}`
      : `${CYAN}[ INDICE ]${RESET}\n\n${BLUE}La syllabe : ${CYAN}${syllable.toUpperCase()}${RESET}`
    await channel.send(`\`\`\`ansi\n${hintContent}\n\`\`\``)
  }, 15000)

  const gameTimer = setTimeout(async () => {
    if (!sessions.has(channelId)) return
    clearSession(channelId)

    await bot.users.updateDefGame(starterId, 'played')

    const examples = words.data.words
      .filter(w => cleanAccents(w.toLowerCase()).includes(syllable))
      .slice(0, 5)
      .map(w => `${CYAN}${w.toUpperCase()}${RESET}`)
      .join(', ')

    const timeoutContent =
      `${CYAN}[ TEMPS ÉCOULÉ ! ]${RESET}\n\n` +
      `${BLUE}La syllabe était :${RESET} ${CYAN}${syllable.toUpperCase()}${RESET}\n\n` +
      `${BLUE}Exemples de mots valides :${RESET} ${examples}\n\n` +
      `${BLUE}Bonne chance la prochaine fois !${RESET}`

    await channel.send(`\`\`\`ansi\n${timeoutContent}\n\`\`\``)
  }, 30000)

  sessions.set(channelId, {
    type: 'syl',
    syllable,
    solutionCount,
    starterId,
    channel,
    hintTimer,
    gameTimer
  })

  return [`\`\`\`ansi\n${questionContent}\n\`\`\``]
}
