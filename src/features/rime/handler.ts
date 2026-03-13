import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { shuffle } from '@shared/utils/array'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

const CGRAM_FR: Record<string, string> = {
  NOM: 'Nom', VER: 'Verbe', ADJ: 'Adjectif',
  ADV: 'Adverbe', PRE: 'Préposition', ART: 'Article',
  PRO: 'Pronom', CON: 'Conjonction', ONO: 'Onomatopée', AUX: 'Auxiliaire'
}

export async function rimeHandler ({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire phonétique est en cours de chargement. Réessaie dans un instant.' }
  }

  const targetWord = args[1]
  if (!targetWord) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemples : `.rime maison` · `.rime soleil 2` · `.rime ciel 1 nom`'
    }
  }

  const targetSyllables = args[2] ? parseInt(args[2], 10) : undefined
  const targetCgram     = args[3]?.toUpperCase()

  if (args[2] && isNaN(targetSyllables!)) {
    return { success: false, msg: `"${args[2]}" n'est pas un nombre de syllabes valide.` }
  }

  const source = lexiconService.getWord(targetWord)
  if (!source) {
    return {
      success: false,
      msg: `Le mot "${targetWord}" est introuvable dans le dictionnaire phonétique.`
    }
  }

  const results = lexiconService.getRhymes(targetWord, targetSyllables)
  const filtered = targetCgram
    ? results.filter(w => w.cgram.toUpperCase().startsWith(targetCgram))
    : results

  if (filtered.length === 0) {
    const filters = [
      targetSyllables ? `${targetSyllables} syll.` : null,
      targetCgram ? CGRAM_FR[targetCgram] ?? targetCgram : null
    ].filter(Boolean).join(', ')
    return {
      success: false,
      msg: `Aucune rime trouvée pour "${targetWord}" [${source.phon}]${filters ? ` (${filters})` : ''}.`
    }
  }

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  // Prefer lemmas, shuffle, limit
  const lemmas    = filtered.filter(w => w.isLem)
  const pool      = lemmas.length > 0 ? lemmas : filtered
  const displayed = shuffle([...pool]).slice(0, 20)

  const syllLabel  = targetSyllables ? ` · ${targetSyllables} syll.` : ''
  const cgramLabel = targetCgram ? ` · ${CGRAM_FR[targetCgram] ?? targetCgram}` : ''
  const totalLabel = `${pool.length} rime${pool.length > 1 ? 's' : ''}`

  // Extract the rhyming suffix from the source phonetic
  const phon    = source.phon
  const vowels  = new Set(['a', 'e', 'E', 'i', 'o', 'u', 'y', '§', '5', '1', '2', '9', '@', 'O', 'U', 'A', 'I'])
  let suffixStart = phon.length - 1
  for (let i = phon.length - 1; i >= 0; i--) {
    if (vowels.has(phon[i]!)) { suffixStart = i; break }
  }
  const rimeSuffix = phon.slice(suffixStart)

  let header =
    `${CYAN}[ RIMES PHONÉTIQUES ]${RESET}\n` +
    `${SEP}\n` +
    `${BLUE}Mot${RESET}  : ${CYAN}${source.ortho.toUpperCase()}${RESET}  ${CYAN}[${source.phon}]${RESET}\n` +
    `${BLUE}Rime${RESET} : ${CYAN}…${rimeSuffix}${RESET}${syllLabel}${cgramLabel}\n` +
    `${BLUE}Trouvées${RESET} : ${CYAN}${totalLabel}${RESET} · ${BLUE}affichées${RESET} : ${displayed.length}\n` +
    `${SEP}\n\n`

  const maxLen = Math.max(...displayed.map(w => w.ortho.length), 8)

  let body = ''
  for (const w of displayed) {
    const word = `${CYAN}${w.ortho.padEnd(maxLen + 1)}${RESET}`
    const phonFmt = `${CYAN}[${w.phon}]${RESET}`
    const syll = `${BLUE}${w.nbsyll}s${RESET}`
    const cat  = w.cgram ? `${BLUE}${CGRAM_FR[w.cgram] ?? w.cgram}${RESET}` : ''
    body += `${word} ${phonFmt} ${syll}${cat ? ' · ' + cat : ''}\n`
  }

  if (pool.length > 20) {
    body += `\n${BLUE}... et ${pool.length - 20} autres. Relance pour en voir d'autres.${RESET}`
  }

  const full = header + body
  const ansiMsg = `\`\`\`ansi\n${full.trimEnd()}\n\`\`\``

  if (fitsInMessage(ansiMsg)) return [ansiMsg]

  return [
    `\`\`\`ansi\n${header.trimEnd()}\n\`\`\``,
    `\`\`\`ansi\n${body.trimEnd()}\n\`\`\``
  ]
}
