import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'
import { sessions, clearSession } from '@features/def-game/session'
import { words } from '@core/dictionary/cache'

const dictionarySet = new Set(words.data.words.map(w => cleanAccents(w.toLowerCase())))

export async function defGameReplyHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  const channelId = message.channelId
  const session = sessions.get(channelId)

  if (!session) {
    return {
      success: false,
      msg: "Aucune partie en cours dans ce salon. Lance un jeu avec `.dg` ou `.sg` !"
    }
  }

  const rawAnswer = args.slice(1).join(' ').trim()
  if (!rawAnswer) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple : `.rep maison`'
    }
  }

  const CYAN = ANSI_COLORS.cyan
  const BLUE = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const answer = cleanAccents(rawAnswer.toLowerCase())

  if (session.type === 'def') {
    if (answer !== session.normalizedWord) {
      const wrongContent =
        `${CYAN}[ MAUVAISE RÉPONSE ]${RESET}\n\n` +
        `${BLUE}"${rawAnswer}" n'est pas le bon mot. Réessaie !${RESET}`
      return [`\`\`\`ansi\n${wrongContent}\n\`\`\``]
    }

    clearSession(channelId)

    const winnerId = message.author.id
    const winnerUser = bot.users.getUser(winnerId)

    await bot.users.updateDefGame(session.starterId, 'played')
    if (winnerUser) await bot.users.updateDefGame(winnerId, 'won')

    const updatedWinner = bot.users.getUser(winnerId)
    const statsLine = updatedWinner?.defGame
      ? `${BLUE}Score : ${updatedWinner.defGame.wins} victoire${updatedWinner.defGame.wins > 1 ? 's' : ''} · ${updatedWinner.defGame.played} partie${updatedWinner.defGame.played > 1 ? 's' : ''} jouée${updatedWinner.defGame.played > 1 ? 's' : ''}${RESET}`
      : ''

    const successContent =
      `${CYAN}[ BONNE RÉPONSE ! ]${RESET}\n\n` +
      `${CYAN}${message.author.username.toUpperCase()}${RESET} a trouvé le mot !\n\n` +
      `${BLUE}Le mot était :${RESET} ${CYAN}${session.displayWord.toUpperCase()}${RESET}` +
      (statsLine ? `\n\n${statsLine}` : '')

    return [`\`\`\`ansi\n${successContent}\n\`\`\``]
  }

  if (session.type === 'syl') {
    const containsSyllable = answer.includes(session.syllable)
    const inDictionary = dictionarySet.has(answer)

    if (!containsSyllable || !inDictionary) {
      const reason = !inDictionary
        ? `"${rawAnswer}" n'existe pas dans le dictionnaire.`
        : `"${rawAnswer}" ne contient pas la syllabe ${session.syllable.toUpperCase()}.`
      const wrongContent =
        `${CYAN}[ MAUVAISE RÉPONSE ]${RESET}\n\n` +
        `${BLUE}${reason} Réessaie !${RESET}`
      return [`\`\`\`ansi\n${wrongContent}\n\`\`\``]
    }

    clearSession(channelId)

    const winnerId = message.author.id
    const winnerUser = bot.users.getUser(winnerId)

    await bot.users.updateDefGame(session.starterId, 'played')
    if (winnerUser) await bot.users.updateDefGame(winnerId, 'won')

    const updatedWinner = bot.users.getUser(winnerId)
    const statsLine = updatedWinner?.defGame
      ? `${BLUE}Score : ${updatedWinner.defGame.wins} victoire${updatedWinner.defGame.wins > 1 ? 's' : ''} · ${updatedWinner.defGame.played} partie${updatedWinner.defGame.played > 1 ? 's' : ''} jouée${updatedWinner.defGame.played > 1 ? 's' : ''}${RESET}`
      : ''

    const successContent =
      `${CYAN}[ BONNE RÉPONSE ! ]${RESET}\n\n` +
      `${CYAN}${message.author.username.toUpperCase()}${RESET} a trouvé un mot avec la syllabe ${CYAN}${session.syllable.toUpperCase()}${RESET} !\n\n` +
      `${BLUE}Mot trouvé :${RESET} ${CYAN}${rawAnswer.toUpperCase()}${RESET}\n` +
      `${BLUE}(${session.solutionCount} mot${session.solutionCount > 1 ? 's' : ''} valide${session.solutionCount > 1 ? 's' : ''} au total dans le dictionnaire)${RESET}` +
      (statsLine ? `\n\n${statsLine}` : '')

    return [`\`\`\`ansi\n${successContent}\n\`\`\``]
  }

  return { success: false, msg: 'Type de session inconnu.' }
}
