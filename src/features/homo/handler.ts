import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'
import { shuffle } from '@shared/utils/array'

const CGRAM_FR: Record<string, string> = {
  NOM: 'Nom', VER: 'Verbe', ADJ: 'Adjectif', ADV: 'Adverbe',
  PRE: 'Préposition', ART: 'Article', PRO: 'Pronom',
  CON: 'Conjonction', ONO: 'Onomatopée', AUX: 'Auxiliaire'
}

export async function homoHandler ({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire est en cours de chargement.' }
  }

  const mot = args[1]
  if (!mot) {
    return { success: false, msg: 'Utilisation : `.homo <mot>`  —  ex: `.homo ver`' }
  }

  const source = lexiconService.getWord(mot)
  if (!source) {
    return { success: false, msg: `"${mot}" introuvable dans le dictionnaire.` }
  }

  const homos = lexiconService.getHomophones(mot)
  const lemmas = homos.filter(w => w.isLem)
  const pool   = lemmas.length > 0 ? lemmas : homos

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  let out = `${CYAN}[ HOMOPHONES · ${source.ortho.toUpperCase()} ]${RESET}\n`
  out += `${SEP}\n`
  out += `${BLUE}Phonétique${RESET} : ${CYAN}[${source.phon}]${RESET}   `
  out += `${BLUE}Catégorie${RESET} : ${BLUE}${(CGRAM_FR[source.cgram] ?? source.cgram) || '—'}${RESET}\n`

  if (pool.length === 0) {
    out += `${SEP}\n`
    out += `${CYAN}Aucun homophone trouvé pour ce mot.${RESET}\n`
    return [`\`\`\`ansi\n${out.trimEnd()}\n\`\`\``]
  }

  out += `${BLUE}Trouvés${RESET} : ${CYAN}${pool.length} homophone${pool.length > 1 ? 's' : ''}${RESET}\n`
  out += `${SEP}\n\n`

  const displayed = shuffle([...pool]).slice(0, 20)
  const maxLen    = Math.max(...displayed.map(w => w.ortho.length), 6)

  for (const w of displayed) {
    const word = `${CYAN}${w.ortho.padEnd(maxLen + 1)}${RESET}`
    const cat  = `${BLUE}${(CGRAM_FR[w.cgram] ?? w.cgram) || '—'}${RESET}`
    const syll = `${BLUE}${w.nbsyll}s${RESET}`
    out += `${word} ${cat}  ${syll}\n`
  }

  return [`\`\`\`ansi\n${out.trimEnd()}\n\`\`\``]
}
