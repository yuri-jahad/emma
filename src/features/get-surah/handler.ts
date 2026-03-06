import type { CommandContext, CommandResponse } from '@shared/command/type'
import { COLORS_MESSAGE } from '@shared/utils/text'

export function surahHandler ({ args, bot }: CommandContext): CommandResponse {
  if (args.length < 2) {
    return {
      success: false,
      msg: 'Syntaxe invalide\nUtilisation correcte : .sourate 2 ou .sourate fatiha 2'
    }
  }

  let queryArgs = args.slice(1)
  let pageNumber = 1

  const lastArg = queryArgs[queryArgs.length - 1]
  if (queryArgs.length > 1 && !isNaN(Number(lastArg))) {
    pageNumber = Math.max(1, Number(lastArg))
    queryArgs.pop()
  }

  const query = queryArgs.join(' ').trim()
  const surah = bot.quran.getSurah(query)

  if (!surah) {
    return {
      success: false,
      msg: `Sourate introuvable\nAucun résultat pour "${query}".`
    }
  }

  const VERSES_PER_PAGE = 10
  const totalPages = Math.ceil(surah.content.length / VERSES_PER_PAGE)

  if (pageNumber > totalPages) {
    return {
      success: false,
      msg: `La sourate "${surah.transcription}" ne possède que ${totalPages} page(s).`
    }
  }

  const titleColor = COLORS_MESSAGE.colors['magenta']
  const resetColor = '\u001b[0m'
  const defaultColor = COLORS_MESSAGE.colors['blue']
  const verseColor = COLORS_MESSAGE.colors['cyan']

  let output = `${titleColor}SOURATE : ${surah.transcription}${resetColor} (${surah.name})\n`
  output += `${defaultColor}Traduction : ${surah.translation}${resetColor}\n`
  output += `${defaultColor}Taille : ${surah.verseCount} | Page ${pageNumber}/${totalPages}${resetColor}\n\n`

  const startIndex = (pageNumber - 1) * VERSES_PER_PAGE
  const endIndex = startIndex + VERSES_PER_PAGE
  const versesToDisplay = surah.content.slice(startIndex, endIndex)

  output += `${titleColor}Versets :${resetColor}\n`

  versesToDisplay.forEach(verse => {
    output += `${verseColor}${verse}${resetColor}\n`
  })

  if (pageNumber < totalPages) {
    output += `\n${defaultColor}Utilisez .sourate ${query} ${
      pageNumber + 1
    } pour voir la suite.${resetColor}`
  }

  const paddedSurahNb = String(surah.surahNb).padStart(3, '0')
  const audioUrl = `https://server8.mp3quran.net/afs/${paddedSurahNb}.mp3`

  const ansiMessage = `\`\`\`ansi\n${output.trimEnd()}\n\`\`\``
  const audioMessage = `🔊 **Écouter la sourate :**\n${audioUrl}`

  return [ansiMessage, audioMessage] as any
}
