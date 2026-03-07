import type { CommandResponse, CommandContext } from '@shared/command/type'

export async function addWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse> {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success && guard.msg) {
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

    let output = ''

    if (addedWords.length > 0) {
      output += `${addedWords.length} mot(s) ajouté(s) avec succès :\n${addedWords.join(', ').toUpperCase()}\n\n`
    }

    if (existingWords.length > 0) {
      output += `${existingWords.length} mot(s) déjà dans votre liste :\n${existingWords.join(', ').toUpperCase()}\n\n`
    }

    if (addedWords.length === 0) {
      return {
        success: false,
        msg: `Aucun nouveau mot n'a été ajouté. Les mots fournis sont déjà dans votre liste.`
      }
    }

    return {
      success: true,
      msg: output.trimEnd()
    }
  } catch (error) {
    console.error(`[AddWords] Erreur lors de l'ajout pour l'utilisateur ${message.author.id}:`, error)
    return {
      success: false,
      msg: "Une erreur interne s'est produite lors de l'ajout des mots à votre liste."
    }
  }
}
