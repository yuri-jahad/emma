import type { CommandResponse } from '@shared/command/type'
import { searchSyllablesRepository } from '@features/search-syllables/repository'
import type { CommandContext } from '../../shared/command/type'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

export async function searchSyllablesHandler(
  { args }: CommandContext
): Promise<CommandResponse | string[]> {
  const [_, arg1, arg2] = args

  if (!arg1) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemples : ".s 2" (2 syllabes), ".s ^er" (commence par er), ou ".s er$ 2".'
    }
  }

  const isArg1Number = /^\d+$/.test(arg1)
  const isArg2Number = arg2 ? /^\d+$/.test(arg2) : false

  const occurrenceCount = isArg1Number ? arg1 : isArg2Number ? arg2 : undefined
  const syllablePattern = !isArg1Number ? arg1 : !isArg2Number ? arg2 : undefined

  try {
    const result = await searchSyllablesRepository(occurrenceCount, syllablePattern)

    if (result.status === 'failed') {
      return {
        success: false,
        msg: `Impossible d'effectuer la recherche : ${result.message.replace(/\n/g, ' - ')}.`
      }
    }

    const match = result.message.match(/^\((\d+)\)/)
    const count = match ? parseInt(match[1], 10) : 0

    if (count === 0) {
      return {
        success: false,
        msg: 'Je n\'ai trouvé aucun résultat correspondant à votre recherche.'
      }
    }

    const syllablesArray = result.message.includes('\n')
      ? result.message.split('\n')[1].trim().split(' ')
      : []

    const searchContext = [
      syllablePattern?.toUpperCase(),
      occurrenceCount ? `${occurrenceCount} SYLLABES` : ''
    ].filter(Boolean).join(' - ')

    const CYAN = ANSI_COLORS.cyan
    const BLUE = ANSI_COLORS.blue
    const RESET = '\u001b[0m'

    const header = `${BLUE}${count} ${count > 1 ? 'résultats trouvés -' : 'résultat trouvé -'} ${syllablesArray.length} affiché(s) (${searchContext})${RESET}\n\n`
    const coloredSyllables = syllablesArray.map((s: string) => `${CYAN}${s}${RESET}`)

    const singleContent = header + coloredSyllables.join(' ')
    if (fitsInMessage(`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``)) {
      return [`\`\`\`ansi\n${singleContent.trimEnd()}\n\`\`\``]
    }

    const rows: string[] = []
    for (let i = 0; i < coloredSyllables.length; i += 10) {
      rows.push(coloredSyllables.slice(i, i + 10).join(' '))
    }

    const messages: string[] = []
    let currentContent = header + (rows[0] ?? '')

    for (let i = 1; i < rows.length; i++) {
      const candidate = currentContent + '\n' + rows[i]
      if (!fitsInMessage(`\`\`\`ansi\n${candidate.trimEnd()}\n\`\`\``)) {
        messages.push(`\`\`\`ansi\n${currentContent.trimEnd()}\n\`\`\``)
        currentContent = rows[i] ?? ''
      } else {
        currentContent = candidate
      }
    }

    if (currentContent.trim()) {
      messages.push(`\`\`\`ansi\n${currentContent.trimEnd()}\n\`\`\``)
    }

    return messages
  } catch (error) {
    console.error(`[SearchSyllables] Erreur avec args: ${args.slice(1).join(' ')}:`, error)
    return {
      success: false,
      msg: 'Une erreur interne s\'est produite lors de la recherche.'
    }
  }
}
