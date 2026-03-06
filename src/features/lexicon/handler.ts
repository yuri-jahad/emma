import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from './service'
import { shuffle } from '@shared/utils/array'
import { COLORS_MESSAGE } from '@shared/utils/text'

export async function lexiconHandler({
  args
}: CommandContext): Promise<CommandResponse> {
  const targetPhon = args[1]
  const targetSyllables = args[2] ? parseInt(args[2], 10) : undefined

  if (!targetPhon) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple : `.c wazo` ou `.c zo 2`'
    }
  }

  try {
    const rawResults = lexiconService.searchWords(targetPhon, targetSyllables)
    const syllContext = targetSyllables ? ` (${targetSyllables} syllabes)` : ''

    if (rawResults.length === 0) {
      return {
        success: false,
        msg: `Aucun mot trouvé contenant le son phonétique "${targetPhon}"${syllContext}.`
      }
    }

    const shuffledResults = shuffle(rawResults)
    const maxResults = 10
    const displayedResults = shuffledResults.slice(0, maxResults)

    const titleColor = COLORS_MESSAGE.colors['magenta']
    const resetColor = '\u001b[0m'
    const wordColor = COLORS_MESSAGE.colors['cyan']
    const phonColor = COLORS_MESSAGE.colors['yellow']
    const infoColor = COLORS_MESSAGE.colors['blue']

    let output = `${titleColor} RÉSULTATS PHONÉTIQUES${resetColor}\n`
    output += `${infoColor}Cible : "${targetPhon}"${syllContext} | Trouvés : ${rawResults.length}${resetColor}\n\n`

    const maxWordLength = Math.max(...displayedResults.map(w => w.ortho.length), 10)

    for (const word of displayedResults) {
      const paddedWord = word.ortho.padEnd(maxWordLength + 2, ' ')
      output += `${wordColor}• ${paddedWord}${resetColor} ${phonColor}[${word.phon}]${resetColor} ${infoColor}(${word.nbsyll} syll.)${resetColor}\n`
    }

    if (rawResults.length > maxResults) {
      output += `\n${infoColor}... et ${rawResults.length - maxResults} autres mots.${resetColor}\n`
      output += `${infoColor}Relancez la commande pour en voir d'autres !${resetColor}`
    }

    const ansiMessage = `\`\`\`ansi\n${output.trimEnd()}\n\`\`\``

    return [ansiMessage] as any

  } catch (error: any) {
    console.error(`[LexiconHandler] Erreur :`, error)
    return {
      success: false,
      msg: "Le dictionnaire phonétique n'est pas prêt ou une erreur est survenue."
    }
  }
}
