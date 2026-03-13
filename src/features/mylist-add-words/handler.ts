import type { CommandResponse, CommandContext } from '@shared/command/type'
import { ANSI_COLORS } from '@shared/utils/text'

export async function addWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success) {
    return guard
  }

  const wordsToAdd = args.slice(1).map(w => w.trim()).filter(w => w.length > 0)

  if (wordsToAdd.length === 0) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple correct : ".add maison chat chien"'
    }
  }

  try {
    const { addedWords, existingWords } = await bot.users.addWords(message.author.id, wordsToAdd)

    if (addedWords.length === 0) {
      return {
        success: false,
        msg: `Aucun nouveau mot n'a été ajouté. Les mots fournis sont déjà dans votre liste.`
      }
    }

    const CYAN   = ANSI_COLORS.cyan
    const BLUE   = ANSI_COLORS.blue
    const RESET  = '\u001b[0m'

    let output = ''

    const addedLabel = `${CYAN}${addedWords.length} mot(s) ajouté(s)${RESET}\n`
    const addedList  = addedWords.map(w => `${CYAN}${w.toUpperCase()}${RESET}`).join(' ')
    output += `${addedLabel}${addedList}`

    if (existingWords.length > 0) {
      const existingLabel = `${BLUE}${existingWords.length} mot(s) déjà présent(s)${RESET}\n`
      const existingList  = existingWords.map(w => `${BLUE}${w.toUpperCase()}${RESET}`).join(' ')
      output += `\n\n${existingLabel}${existingList}`
    }

    return [`\`\`\`ansi\n${output.trimEnd()}\n\`\`\``]
  } catch (error) {
    console.error(`[AddWords] Erreur lors de l'ajout pour l'utilisateur ${message.author.id}:`, error)
    return {
      success: false,
      msg: "Une erreur interne s'est produite lors de l'ajout des mots à votre liste."
    }
  }
}
