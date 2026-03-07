import { words } from '@core/dictionary/cache'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { searchWords, shuffle } from '@shared/utils/array'

export function myListSearchWordsHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): CommandResponse {
  const guard = clientGuard(bot, message.author.id, ['user'])

  if (!guard.success && guard.msg) {
    return guard
  }

  const user = bot.users.getUser(message.author.id)
  if (!user) {
    return {
      success: false,
      msg: "Une erreur s'est produite lors de la récupération de votre profil."
    }
  }

  const { list, username, role } = user

  if (!list || list.length === 0) {
    return {
      success: false,
      msg: `${username}, votre liste personnelle est actuellement vide.`
    }
  }

  const pattern = args[1] || ''
  const hasPattern = pattern.trim().length > 0

  const rawLimit = args[2] ? parseInt(args[2], 10) : hasPattern ? 10 : 20
  const limit = isNaN(rawLimit) ? (hasPattern ? 10 : 20) : rawLimit

  if (args[2] && isNaN(rawLimit)) {
    return {
      success: false,
      msg: `La limite "${args[2]}" n'est pas un nombre valide. Exemple : ".list ${pattern || '20'}".`
    }
  }

  try {
    const dictionary = words
    if (!dictionary.success) {
      return {
        success: false,
        msg: 'Le dictionnaire est actuellement indisponible. Veuillez réessayer plus tard.'
      }
    }

    const arrayToSearch = hasPattern ? list : shuffle([...list])
    const { results, total } = searchWords(pattern, arrayToSearch, limit)

    if (total === 0) {
      return {
        success: false,
        msg: hasPattern
          ? `${username}, je n'ai trouvé aucun mot correspondant au motif "${pattern}" dans votre liste.`
          : 'Votre liste ne contient aucun mot valide à afficher.'
      }
    }

    const wordsDisplay = results.join(' ').replace(/\s+/g, ' ')
    
    const headerTitle = hasPattern ? `RECHERCHE : ${pattern.toUpperCase()}` : 'APERÇU DE LA LISTE'
    const plurielMot = total > 1 ? 'mots' : 'mot'
    
    let output = `[${role.toUpperCase()}] ${username.toUpperCase()}\n`
    output += `${headerTitle}\n`
    output += `${total} ${plurielMot} au total | ${results.length} affiché(s)\n\n`

    output += wordsDisplay
    output += '.'

    return {
      success: true,
      msg: output
    }
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
