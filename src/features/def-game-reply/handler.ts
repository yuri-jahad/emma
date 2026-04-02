import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'
import { sessions, clearSession } from '@features/def-game/session'
import { words } from '@core/dictionary/cache'
import { advanceRound, showFinalScore } from '@features/syl-game/handler'
import type { SendableChannel } from '@features/def-game/session'

const dictionarySet = new Set(words.data.words.map(w => cleanAccents(w.toLowerCase())))

export async function defGameReplyHandler({
  args,
  bot,
  message
}: CommandContext): Promise<CommandResponse | string[]> {
  const channelId = message.channelId
  const session   = sessions.get(channelId)

  if (!session) {
    return { success: false, msg: "Aucune partie en cours dans ce salon. Lance un jeu avec `.dg` ou `.sg` !" }
  }

  const rawAnswer = args.slice(1).join(' ').trim()
  if (!rawAnswer) {
    return { success: false, msg: 'Utilisation invalide. Exemple : `.rep maison`' }
  }

  const CYAN  = ANSI_COLORS.cyan
  const BLUE  = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const answer = cleanAccents(rawAnswer.toLowerCase())

  // ─── Jeu de définition ────────────────────────────────────────────────────

  if (session.type === 'def') {
    if (answer !== session.normalizedWord) {
      return [`\`\`\`ansi\n${CYAN}[ MAUVAISE RÉPONSE ]${RESET}\n\n${BLUE}"${rawAnswer}" n'est pas le bon mot. Réessaie !${RESET}\n\`\`\``]
    }

    clearSession(channelId)

    const winnerId   = message.author.id
    const winnerUser = bot.users.getUser(winnerId)

    await bot.users.updateDefGame(session.starterId, 'played')
    if (winnerUser) await bot.users.updateDefGame(winnerId, 'won')

    const updated   = bot.users.getUser(winnerId)
    const statsLine = updated?.defGame
      ? `${BLUE}Score : ${updated.defGame.wins} victoire${updated.defGame.wins > 1 ? 's' : ''} · ${updated.defGame.played} partie${updated.defGame.played > 1 ? 's' : ''} jouée${updated.defGame.played > 1 ? 's' : ''}${RESET}`
      : ''

    const content =
      `${CYAN}[ BONNE RÉPONSE ! ]${RESET}\n\n` +
      `${CYAN}${message.author.username.toUpperCase()}${RESET} a trouvé le mot !\n\n` +
      `${BLUE}Le mot était :${RESET} ${CYAN}${session.displayWord.toUpperCase()}${RESET}` +
      (statsLine ? `\n\n${statsLine}` : '')

    return [`\`\`\`ansi\n${content}\n\`\`\``]
  }

  // ─── Jeu de syllabes ─────────────────────────────────────────────────────

  if (session.type === 'syl') {
    const containsSyllable = answer.includes(cleanAccents(session.syllable))
    const inDictionary     = dictionarySet.has(answer)

    if (!containsSyllable || !inDictionary) {
      const reason = !inDictionary
        ? `"${rawAnswer}" n'existe pas dans le dictionnaire.`
        : `"${rawAnswer}" ne contient pas la syllabe ${session.syllable.toUpperCase()}.`
      return [`\`\`\`ansi\n${CYAN}[ MAUVAISE RÉPONSE ]${RESET}\n\n${BLUE}${reason} Réessaie !${RESET}\n\`\`\``]
    }

    // ── Bonne réponse ─────────────────────────────────────────────────────
    const winnerId       = message.author.id
    const winnerUsername = message.author.username

    // Mettre à jour les scores de la partie
    if (!session.scores[winnerId]) {
      session.scores[winnerId] = { username: winnerUsername, wins: 0 }
    }
    session.scores[winnerId]!.wins += 1

    await bot.users.updateDefGame(session.starterId, 'played')
    const winnerUser = bot.users.getUser(winnerId)
    if (winnerUser) await bot.users.updateDefGame(winnerId, 'won')

    const updated   = bot.users.getUser(winnerId)
    const statsLine = updated?.defGame
      ? `${BLUE}Score perso : ${updated.defGame.wins} vic. · ${updated.defGame.played} parties${RESET}`
      : ''

    const isMultiRound = session.totalRounds > 1
    const roundInfo    = isMultiRound
      ? `\n${BLUE}Manche ${session.round}/${session.totalRounds} terminée !${RESET}`
      : ''

    const content =
      `${CYAN}[ BONNE RÉPONSE ! ]${RESET}\n\n` +
      `${CYAN}${winnerUsername.toUpperCase()}${RESET} a trouvé un mot avec ${CYAN}${session.syllable.toUpperCase()}${RESET} !\n\n` +
      `${BLUE}Mot :${RESET} ${CYAN}${rawAnswer.toUpperCase()}${RESET}` +
      `  ${BLUE}(${session.solutionCount} mot${session.solutionCount > 1 ? 's' : ''} valide${session.solutionCount > 1 ? 's' : ''})${RESET}` +
      roundInfo +
      (statsLine ? `\n${statsLine}` : '')

    // ── Suite : manche suivante ou fin ────────────────────────────────────
    if (session.queue.length > 0) {
      // Avancer à la prochaine manche (envoie la question 2s après)
      await advanceRound(channelId, session, session.channel as SendableChannel, session.starterId, bot, winnerId)
    } else {
      // Dernière manche terminée
      if (isMultiRound) {
        setTimeout(async () => {
          await showFinalScore(session.channel as SendableChannel, session)
        }, 1500)
      }
      clearSession(channelId)
    }

    return [`\`\`\`ansi\n${content}\n\`\`\``]
  }

  return { success: false, msg: 'Type de session inconnu.' }
}
