import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { ANSI_COLORS } from '@shared/utils/text'

const CGRAM_FR: Record<string, string> = {
  NOM: 'Nom', VER: 'Verbe', ADJ: 'Adjectif', ADV: 'Adverbe',
  PRE: 'Préposition', ART: 'Article', PRO: 'Pronom',
  CON: 'Conjonction', ONO: 'Onomatopée', AUX: 'Auxiliaire'
}

function freqLabel (freq: number): string {
  if (freq > 5000)  return '★★★★★  Omniprésent'
  if (freq > 500)   return '★★★★☆  Très fréquent'
  if (freq > 50)    return '★★★☆☆  Fréquent'
  if (freq > 5)     return '★★☆☆☆  Courant'
  if (freq > 0.5)   return '★☆☆☆☆  Peu courant'
  if (freq > 0.05)  return '☆☆☆☆☆  Rare'
  return                          '☆☆☆☆☆  Très rare'
}

export async function freqHandler ({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire est en cours de chargement.' }
  }

  const mot = args[1]
  if (!mot) {
    return { success: false, msg: 'Utilisation : `.freq <mot>`  —  ex: `.freq zénith`' }
  }

  const entry = lexiconService.getWord(mot)
  if (!entry) {
    return { success: false, msg: `"${mot}" introuvable dans le dictionnaire.` }
  }

  const forms = lexiconService.getForms(entry.lemme)
    .filter(f => f.ortho.toLowerCase() !== entry.ortho.toLowerCase())
    .slice(0, 8)

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  let out = `${CYAN}[ FRÉQUENCE · ${entry.ortho.toUpperCase()} ]${RESET}\n`
  out += `${SEP}\n`
  out += `${BLUE}Phonétique${RESET} : ${CYAN}[${entry.phon}]${RESET}   ${BLUE}Syllabes${RESET} : ${entry.nbsyll}   ${BLUE}Lettres${RESET} : ${entry.nbLettres}\n`
  out += `${BLUE}Catégorie${RESET}  : ${BLUE}${(CGRAM_FR[entry.cgram] ?? entry.cgram) || '—'}${RESET}   ${BLUE}Lemme${RESET} : ${entry.lemme}\n`
  out += `${SEP}\n`
  out += `${BLUE}Fréquence${RESET} : ${CYAN}${entry.freq.toFixed(3)} occ/million${RESET}\n`
  out += `${CYAN}${freqLabel(entry.freq)}${RESET}\n`

  if (forms.length > 0) {
    out += `${SEP}\n`
    out += `${BLUE}Formes associées${RESET} : ${forms.map(f => `${CYAN}${f.ortho}${RESET} ${CYAN}[${f.phon}]${RESET} ${BLUE}(${CGRAM_FR[f.cgram] ?? f.cgram})${RESET}`).join('  ')}\n`
  }

  return [`\`\`\`ansi\n${out.trimEnd()}\n\`\`\``]
}
