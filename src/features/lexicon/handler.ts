import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from './service'
import { shuffle } from '@shared/utils/array'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

const CGRAM_FR: Record<string, string> = {
  NOM: 'Nom', VER: 'Verbe', ADJ: 'Adjectif',
  ADV: 'Adverbe', PRE: 'Préposition', ART: 'Article',
  PRO: 'Pronom', CON: 'Conjonction', ONO: 'Onomatopée', AUX: 'Auxiliaire'
}

export async function lexiconHandler({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire phonétique est en cours de chargement. Réessaie dans un instant.' }
  }

  const targetPhon = args[1]
  if (!targetPhon) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemples : `.phon zo` · `.phon mEz§ 2` · `.phon twa 2 nom`'
    }
  }

  const targetSyllables = args[2] ? parseInt(args[2], 10) : undefined
  const targetCgram = args[3]?.toUpperCase()

  if (args[2] && isNaN(targetSyllables!)) {
    return { success: false, msg: `"${args[2]}" n'est pas un nombre de syllabes valide.` }
  }

  const results = lexiconService.searchBySound(targetPhon, targetSyllables, targetCgram)

  if (results.length === 0) {
    const filters = [
      targetSyllables ? `${targetSyllables} syll.` : null,
      targetCgram ? CGRAM_FR[targetCgram] ?? targetCgram : null
    ].filter(Boolean).join(', ')
    return {
      success: false,
      msg: `Aucun mot trouvé pour le son "${targetPhon}"${filters ? ` (${filters})` : ''}.`
    }
  }

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  const lemmas = results.filter(w => w.isLem)
  const pool = lemmas.length > 0 ? lemmas : results
  const displayed = shuffle([...pool]).slice(0, 15)

  const syllLabel = targetSyllables ? ` · ${targetSyllables} syll.` : ''
  const cgramLabel = targetCgram ? ` · ${CGRAM_FR[targetCgram] ?? targetCgram}` : ''
  const totalLabel = `${pool.length} résultat${pool.length > 1 ? 's' : ''}`

  let header =
    `${CYAN}[ RECHERCHE PHONÉTIQUE ]${RESET}\n` +
    `${SEP}\n` +
    `${BLUE}Son${RESET} : ${CYAN}${targetPhon}${RESET}${syllLabel}${cgramLabel}\n` +
    `${BLUE}Trouvés${RESET} : ${CYAN}${totalLabel}${RESET} · ${BLUE}affichés${RESET} : ${displayed.length}\n` +
    `${SEP}\n\n`

  const maxLen = Math.max(...displayed.map(w => w.ortho.length), 8)

  let body = ''
  for (const w of displayed) {
    const word = `${CYAN}${w.ortho.padEnd(maxLen + 1)}${RESET}`
    const phon = `${CYAN}[${w.phon}]${RESET}`
    const syll = `${BLUE}${w.nbsyll}s${RESET}`
    const cat = w.cgram ? `${BLUE}${CGRAM_FR[w.cgram] ?? w.cgram}${RESET}` : ''
    body += `${word} ${phon} ${syll}${cat ? ' · ' + cat : ''}\n`
  }

  if (pool.length > 15) {
    body += `\n${BLUE}... et ${pool.length - 15} autres. Relance pour en voir d'autres.${RESET}`
  }

  const full = header + body
  const ansiMessage = `\`\`\`ansi\n${full.trimEnd()}\n\`\`\``

  if (fitsInMessage(ansiMessage)) return [ansiMessage]

  const msg1 = `\`\`\`ansi\n${header.trimEnd()}\n\`\`\``
  const msg2 = `\`\`\`ansi\n${body.trimEnd()}\n\`\`\``
  return [msg1, msg2]
}
