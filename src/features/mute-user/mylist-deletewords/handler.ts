import type { CommandResponse, CommandContext } from '@shared/command/type'

export async function deleteWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse> {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success && guard.msg) {
    return guard
  }

  // Stockage en minuscules
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

    const notFoundWords = wordsToRemove.filter(w => !deletedWords.includes(w))
    
    // Affichage en majuscules via .toUpperCase() sur le join
    let output = `${deletedWords.length} mot(s) supprimé(s) avec succès :\n${deletedWords.join(', ').toUpperCase()}\n\n`

    if (notFoundWords.length > 0) {
      output += `${notFoundWords.length} mot(s) introuvable(s) dans votre liste :\n${notFoundWords.join(', ').toUpperCase()}\n`
    }

    return {
      success: true,
      msg: output.trimEnd()
    }
  } catch (error) {
    console.error(`[DeleteWords] Erreur lors de la suppression pour l'utilisateur ${message.author.id}:`, error)
    return {
      success: false,
      msg: "Une erreur interne s'est produite lors de la suppression des mots."
    }
  }
}
