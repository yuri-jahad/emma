import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

export function surahHandler ({ args, bot }: CommandContext): CommandResponse | string[] {
  if (args.length < 2) {
    return { success: false, msg: 'Syntaxe invalide' }
  }

  let queryArgs = args.slice(1)
  let pageNumber = 1
  let showFr = false

  const filtered = queryArgs.filter(a => {
    if (a === 'fr') { showFr = true; return false }
    return true
  })
  queryArgs = filtered

  const lastArg = queryArgs[queryArgs.length - 1]
  if (queryArgs.length > 1 && !isNaN(Number(lastArg))) {
    pageNumber = Math.max(1, Number(lastArg))
    queryArgs = queryArgs.slice(0, -1)
  }

  const query = queryArgs.join(' ').trim()
  if (!query) {
    return { success: false, msg: 'Syntaxe invalide' }
  }

  const surah = bot.quran.getSurah(query)
  if (!surah) {
    return {
      success: false,
      msg: `Sourate introuvable\nAucun résultat pour "${query}".`
    }
  }

  const RESET  = '\u001b[0m'
  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue

  const buildOutput = (versesPerPage: number): { output: string; totalPages: number } => {
    const totalPages = Math.ceil(surah.content.length / versesPerPage)
    const startIndex = (pageNumber - 1) * versesPerPage
    const versesToDisplay = surah.content.slice(startIndex, startIndex + versesPerPage)
    const frToDisplay = surah.contentFr?.slice(startIndex, startIndex + versesPerPage) ?? []

    const frFlag = showFr ? ` ${CYAN}[FR]${RESET}` : ''
    let output = ''

    output += `${CYAN}[ ${surah.transcription.toUpperCase()} ]${RESET}${frFlag}\n`
    output += `${BLUE}${'─'.repeat(40)}${RESET}\n`
    output += `${BLUE}Nom arabe  ${RESET}: ${surah.name}\n`
    output += `${BLUE}Traduction ${RESET}: ${CYAN}${surah.translation}${RESET}\n`
    output += `${BLUE}Versets    ${RESET}: ${surah.verseCount}   ${BLUE}Page ${RESET}: ${CYAN}${pageNumber}/${totalPages}${RESET}\n`
    output += `${BLUE}${'─'.repeat(40)}${RESET}\n\n`

    for (let i = 0; i < versesToDisplay.length; i++) {
      const verseNumber = startIndex + i + 1
      const num = `${CYAN}${String(verseNumber).padStart(3, '0')}${RESET}`
      output += `${num} ${CYAN}${versesToDisplay[i]}${RESET}\n`
      if (showFr && frToDisplay[i]) {
        output += `    ${BLUE}${frToDisplay[i]}${RESET}\n`
      }
    }

    if (pageNumber < totalPages) {
      const frSuffix = showFr ? ' fr' : ''
      output += `\n${BLUE}${'─'.repeat(40)}${RESET}\n`
      output += `${CYAN}▶ .surah ${query}${frSuffix} ${pageNumber + 1} pour la suite${RESET}`
    }

    return { output, totalPages }
  }

  let versesPerPage = 10
  let output!: string
  let totalPages!: number
  let ansiMessage!: string

  while (versesPerPage > 1) {
    const result = buildOutput(versesPerPage)
    output = result.output
    totalPages = result.totalPages
    ansiMessage = `\`\`\`ansi\n${output.trimEnd()}\n\`\`\``
    if (fitsInMessage(ansiMessage)) break
    versesPerPage--
  }

  if (pageNumber > totalPages) {
    return {
      success: false,
      msg: `La sourate "${surah.transcription}" ne possède que ${totalPages} page(s).`
    }
  }

  const paddedSurahNb = String(surah.surahNb).padStart(3, '0')
  const audioUrl = `https://server8.mp3quran.net/afs/${paddedSurahNb}.mp3`
  const audioMessage = `🔊 Écouter la sourate :\n${audioUrl}`

  return [ansiMessage, audioMessage]
}
