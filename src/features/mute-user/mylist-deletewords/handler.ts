import type { CommandResponse, CommandContext } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

export async function deleteWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success) {
    return guard
  }

  const wordsToRemove = args.slice(1).map(w => w.trim()).filter(w => w.length > 0)

  if (wordsToRemove.length === 0) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple correct : ".delete maison chat chien"'
    }
  }

  const user = bot.users.getUser(message.author.id)
  if (!user || !user.list || user.list.length === 0) {
    return {
      success: false,
      msg: "Votre liste est déjà vide."
    }
  }

  try {
    const deletedWords = await bot.users.deleteWords(message.author.id, wordsToRemove)

    if (deletedWords.length === 0) {
      return {
        success: false,
        msg: "Aucun mot n'a été supprimé. Les mots fournis n'étaient pas dans votre liste."
      }
    }

    const deletedSet = new Set(deletedWords)
    const notFoundWords = wordsToRemove.filter(w => !deletedSet.has(w))

    const CYAN   = ANSI_COLORS.cyan
    const BLUE   = ANSI_COLORS.blue
    const RESET  = '\u001b[0m'

    const deletedLabel = `${CYAN}${deletedWords.length} mot(s) supprimé(s)${RESET}\n`
    const deletedList  = deletedWords.map(w => `${CYAN}${w.toUpperCase()}${RESET}`).join(' ')
    let output = `${deletedLabel}${deletedList}`

    if (notFoundWords.length > 0) {
      const notFoundLabel = `${BLUE}${notFoundWords.length} mot(s) introuvable(s)${RESET}\n`
      const notFoundList  = notFoundWords.map(w => `${BLUE}${w.toUpperCase()}${RESET}`).join(' ')
      output += `\n\n${notFoundLabel}${notFoundList}`
    }

    return [`\`\`\`ansi\n${output.trimEnd()}\n\`\`\``]
  } catch (error) {
    console.error(`[DeleteWords] Erreur lors de la suppression pour l'utilisateur ${message.author.id}:`, error)
    return {
      success: false,
      msg: "Une erreur interne s'est produite lors de la suppression des mots."
    }
  }
}
