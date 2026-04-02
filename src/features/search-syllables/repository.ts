import { words } from '@core/dictionary/cache'
import { shuffle } from '@shared/utils/array'

export const searchSyllablesRepository = async (
  occurrenceCount?: string,
  pattern?: string
): Promise<any> => {
  if (!occurrenceCount && !pattern) {
    return { status: 'failed', message: 'Paramètres manquants.' }
  }

  const hasCount = occurrenceCount !== undefined
  const hasPattern = pattern !== undefined
  const parsedCount = hasCount ? parseInt(occurrenceCount as string, 10) : undefined

  if (hasCount && isNaN(parsedCount as number)) {
    return { status: 'failed', message: "L'occurrence n'est pas un nombre valide." }
  }

  let regexPattern: RegExp | null = null
  if (hasPattern) {
    try {
      regexPattern = new RegExp(pattern as string, 'i')
    } catch (e) {
      return { status: 'failed', message: 'Expression régulière (Regex) invalide.' }
    }
  }

  let syllables: string[] = []

  for (const [syllable, count] of Object.entries(words.data.occurrences)) {
    let matchCount = true
    let matchPattern = true

    if (hasCount) {
      matchCount = count === (parsedCount as number) * 2
    }

    if (hasPattern && regexPattern) {
      matchPattern = regexPattern.test(syllable)
    }

    if (matchCount && matchPattern) {
      syllables.push(syllable.toUpperCase())
    }
  }

  syllables = shuffle(syllables)
  const totalFound = syllables.length
  
  const message =
    totalFound > 0
      ? `(${totalFound})\n${syllables.slice(0, 400).join(' ')}`
      : 'Aucune syllabe n\'a été trouvée.'

  return { status: 'success', message }
}
