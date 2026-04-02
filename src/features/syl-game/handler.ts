import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'
import { sessions, clearSession } from '@features/def-game/session'
import type { SylGameSession, SendableChannel } from '@features/def-game/session'
import { words } from '@core/dictionary/cache'
import { shuffle } from '@shared/utils/array'

const DEFAULT_ROUNDS = 1
const MAX_ROUNDS     = 20
const MIN_SOLUTIONS  = 3

export function buildSylQuestion (
  syllable: string,
  solutionCount: number,
  round: number,
  totalRounds: number
): string {
  const CYAN  = ANSI_COLORS.cyan
  const BLUE  = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const roundTag = totalRounds > 1
    ? `${BLUE}Manche ${round}/${totalRounds}${RESET}\n\n`
    : ''

  return (
    `${CYAN}[ JEU DE SYLLABES ]${RESET}\n\n` +
    roundTag +
    `${BLUE}Syllabe :${RESET} ${CYAN}${syllable.toUpperCase()}${RESET}\n\n` +
    `${CYAN}${solutionCount} mot${solutionCount > 1 ? 's' : ''} du dictionnaire contien${solutionCount > 1 ? 'nent' : 't'} cette syllabe.\n` +
    `Réponds avec \`.rep <mot>\` — 30 sec  ·  \`.skip\` pour passer${RESET}`
  )
}

export function startRoundTimers (
  channelId: string,
  session: SylGameSession,
  channel: SendableChannel,
  starterId: string,
  bot: any
): void {
  const { syllable } = session
  const CYAN  = ANSI_COLORS.cyan
  const BLUE  = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const hintTimer = setTimeout(async () => {
    if (sessions.get(channelId) !== session) return
    const hint = words.data.words.find(w => cleanAccents(w.toLowerCase()).includes(cleanAccents(syllable)))
    const hintContent = hint
      ? `${CYAN}[ INDICE ]${RESET}\n\n` +
        `${BLUE}Un mot valide fait${RESET} ${CYAN}${hint.length} lettre${hint.length > 1 ? 's' : ''}${RESET} ` +
        `${BLUE}et commence par${RESET} ${CYAN}${hint[0]!.toUpperCase()}${RESET}`
      : `${CYAN}[ INDICE ]${RESET}\n\n${BLUE}Syllabe : ${CYAN}${syllable.toUpperCase()}${RESET}`
    await channel.send(`\`\`\`ansi\n${hintContent}\n\`\`\``)
  }, 15000)

  const gameTimer = setTimeout(async () => {
    if (sessions.get(channelId) !== session) return
    await bot.users.updateDefGame(starterId, 'played')

    const examples = words.data.words
      .filter(w => cleanAccents(w.toLowerCase()).includes(cleanAccents(syllable)))
      .slice(0, 5)
      .map(w => `${CYAN}${w.toUpperCase()}${RESET}`)
      .join(', ')

    const timeoutContent =
      `${CYAN}[ TEMPS ÉCOULÉ ! ]${RESET}\n\n` +
      `${BLUE}La syllabe était :${RESET} ${CYAN}${syllable.toUpperCase()}${RESET}\n\n` +
      `${BLUE}Exemples :${RESET} ${examples}`

    await channel.send(`\`\`\`ansi\n${timeoutContent}\n\`\`\``)

    if (session.queue.length > 0) {
      await advanceRound(channelId, session, channel, starterId, bot, null)
    } else {
      if (session.totalRounds > 1) await showFinalScore(channel, session)
      clearSession(channelId)
    }
  }, 30000)

  session.hintTimer = hintTimer
  session.gameTimer = gameTimer
}

export async function advanceRound (
  channelId: string,
  session: SylGameSession,
  channel: SendableChannel,
  starterId: string,
  bot: any,
  _winnerId: string | null
): Promise<void> {
  if (session.hintTimer) clearTimeout(session.hintTimer)
  clearTimeout(session.gameTimer)

  const nextSyl    = session.queue.shift()!
  const nextCount  = (words.data.occurrences[nextSyl] ?? 0) / 2

  session.syllable      = nextSyl
  session.solutionCount = nextCount
  session.round        += 1
  session.hintTimer     = null

  setTimeout(async () => {
    if (sessions.get(channelId) !== session) return
    const question = buildSylQuestion(nextSyl, nextCount, session.round, session.totalRounds)
    await channel.send(`\`\`\`ansi\n${question}\n\`\`\``)
    startRoundTimers(channelId, session, channel, starterId, bot)
  }, 2000)
}

export async function showFinalScore (
  channel: SendableChannel,
  session: SylGameSession
): Promise<void> {
  const CYAN  = ANSI_COLORS.cyan
  const BLUE  = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const entries = Object.values(session.scores).sort((a, b) => b.wins - a.wins)
  const scoreboard = entries.length
    ? entries.map((e, i) =>
        `  ${BLUE}${i + 1}.${RESET} ${CYAN}${e.username}${RESET} — ${e.wins} manche${e.wins > 1 ? 's' : ''}`
      ).join('\n')
    : `  ${BLUE}Personne n'a trouvé de mot…${RESET}`

  await channel.send(`\`\`\`ansi\n` +
    `${CYAN}[ FIN DE PARTIE · ${session.totalRounds} MANCHE${session.totalRounds > 1 ? 'S' : ''} ]${RESET}\n\n` +
    `${BLUE}Classement :${RESET}\n${scoreboard}\n\`\`\``)
}

// ─── Handler principal ────────────────────────────────────────────────────────
// Usage : .sg [manches] [solutions_exactes]
//   .sg          → 1 manche, syllabe aléatoire
//   .sg 5        → 5 manches, syllabes aléatoires
//   .sg 5 10     → 5 manches, syllabes ayant exactement 10 solutions
//   .sg 1 10     → 1 manche, syllabe avec exactement 10 solutions

export async function sylGameHandler ({
  args,
  bot,
  message,
}: CommandContext): Promise<CommandResponse | string[]> {
  const channelId = message.channelId
  if (sessions.has(channelId)) {
    return { success: false, msg: "Une partie est déjà en cours dans ce salon. Utilise `.rep <mot>` pour répondre ou `.skip` pour passer !" }
  }

  // Arg 1 : nombre de manches
  const rawRounds  = args[1] ? parseInt(args[1], 10) : DEFAULT_ROUNDS
  if (args[1] && isNaN(rawRounds)) {
    return { success: false, msg: `Usage : \`.sg [manches] [solutions]\` — ex: \`.sg 5\`, \`.sg 3 10\`` }
  }
  const totalRounds = Math.min(Math.max(rawRounds, 1), MAX_ROUNDS)

  // Arg 2 : nombre de solutions exact (optionnel)
  const rawSol     = args[2] ? parseInt(args[2], 10) : undefined
  if (args[2] && isNaN(rawSol!)) {
    return { success: false, msg: `Usage : \`.sg [manches] [solutions]\` — ex: \`.sg 5\`, \`.sg 3 10\`` }
  }
  const exactSolutions = rawSol && rawSol >= 1 ? rawSol : undefined

  const occurrences = words.data.occurrences

  // Filtrer le pool selon les critères
  const pool = Object.entries(occurrences)
    .filter(([, count]) =>
      exactSolutions !== undefined ? count === exactSolutions * 2 : count >= MIN_SOLUTIONS * 2
    )
    .map(([syl]) => syl)

  if (pool.length < totalRounds) {
    const msg = exactSolutions !== undefined
      ? `Aucune syllabe trouvée avec exactement ${exactSolutions} solution${exactSolutions > 1 ? 's' : ''} (ou pas assez pour ${totalRounds} manches).`
      : `Pas assez de syllabes disponibles pour ${totalRounds} manches.`
    return { success: false, msg }
  }

  const picked     = shuffle(pool).slice(0, totalRounds)
  const firstSyl   = picked[0]!
  const firstCount = (occurrences[firstSyl] ?? 0) / 2
  const queue      = picked.slice(1)
  const starterId  = message.author.id
  const channel    = message.channel as SendableChannel

  const session: SylGameSession = {
    type: 'syl',
    syllable:      firstSyl,
    solutionCount: firstCount,
    round:         1,
    totalRounds,
    queue,
    scores:        {},
    starterId,
    channel,
    hintTimer:     null,
    gameTimer:     null as any,
  }

  sessions.set(channelId, session)
  startRoundTimers(channelId, session, channel, starterId, bot)

  const question = buildSylQuestion(firstSyl, firstCount, 1, totalRounds)
  return [`\`\`\`ansi\n${question}\n\`\`\``]
}
