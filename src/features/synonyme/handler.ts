import { phantApi } from '@shared/api/client'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { COLORS_MESSAGE, ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

const R = '\u001b[0m'
const B = ANSI_COLORS.blue
const C = ANSI_COLORS.cyan
const Y = ANSI_COLORS.yellow
const G = ANSI_COLORS.green
const M = ANSI_COLORS.magenta

function extractList (data: any): string[] {
  if (!data || !data.success) return []
  // Handle various response shapes
  const raw = data.synonyms ?? data.antonyms ?? data.words ?? data.data ?? data.list ?? []
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) =>
    typeof item === 'string' ? item : (item.word ?? item.name ?? String(item))
  ).filter(Boolean)
}

function formatSection (label: string, color: string, words: string[]): string {
  if (!words.length) return `${color}${label}${R}\n${M}aucun résultat${R}`
  const joined = words.map(w => `${C}${w}${R}`).join(` ${Y}·${R} `)
  return `${color}${label}${R}\n${joined}`
}

export async function synonymeHandler ({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  const word = args[1]
  if (!word) {
    return {
      success: false,
      msg: 'Utilisation : ".syn maison" | ".synonyme beau"'
    }
  }

  try {
    const [synResult, antResult] = await Promise.all([
      phantApi.synonymes(word),
      phantApi.antonymes(word)
    ])

    const synonyms  = extractList(synResult)
    const antonyms  = extractList(antResult)

    if (!synonyms.length && !antonyms.length) {
      return {
        success: false,
        msg: `Aucun synonyme ni antonyme trouvé pour "${word}".`
      }
    }

    const wordLabel = word.toUpperCase()
    const header    = `${B}[ ${wordLabel} ]${R}\n`

    const synCount  = synonyms.length
    const antCount  = antonyms.length
    const counts    = `${G}${synCount} synonyme${synCount > 1 ? 's' : ''}${R}  ${M}${antCount} antonyme${antCount > 1 ? 's' : ''}${R}`

    const synSection = formatSection('SYNONYMES', G, synonyms)
    const antSection = formatSection('ANTONYMES', M, antonyms)

    const body    = `${counts}\n\n${synSection}\n\n${antSection}`
    const fullMsg = `\`\`\`ansi\n${header}${body}\n\`\`\``

    if (fitsInMessage(fullMsg)) return [fullMsg]

    // Split: header + synonyms first, then antonyms
    const msg1 = `\`\`\`ansi\n${header}${counts}\n\n${synSection}\n\`\`\``
    const msg2 = `\`\`\`ansi\n${M}ANTONYMES${R} ${B}(${wordLabel})${R}\n${
      antonyms.map(w => `${C}${w}${R}`).join(` ${Y}·${R} `)
    }\n\`\`\``

    // If msg1 still too long, chunk synonyms
    if (!fitsInMessage(msg1)) {
      const messages: string[] = []
      const CHUNK = 900

      let current = ''
      for (const w of synonyms) {
        const part = `${C}${w}${R} ${Y}·${R} `
        if ((current + part).length > CHUNK) {
          messages.push(`\`\`\`ansi\n${messages.length === 0 ? header + counts + '\n\n' + G + 'SYNONYMES' + R + '\n' : ''}${current.trimEnd().replace(/ ·$/, '')}\n\`\`\``)
          current = ''
        }
        current += part
      }
      if (current) messages.push(`\`\`\`ansi\n${current.trimEnd().replace(/ ·$/, '')}\n\`\`\``)
      messages.push(msg2)
      return messages
    }

    return [msg1, msg2]

  } catch (error) {
    console.error(`[Synonyme] Erreur pour "${word}":`, error)
    return {
      success: false,
      msg: `Une erreur s'est produite pour "${word}".`
    }
  }
}
