import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { ANSI_COLORS } from '@shared/utils/text'

type Theme = {
  label: string
  cgrams: string[]
  minFreq: number
  maxFreq: number
  minSyll: number
  maxSyll: number
}

const THEMES: Record<string, Theme> = {
  battle: { label: 'BATTLE',    cgrams: ['NOM', 'VER', 'ADJ'], minFreq: 0.5,  maxFreq: 80,  minSyll: 2, maxSyll: 4 },
  dark:   { label: 'DARK',      cgrams: ['NOM', 'ADJ'],        minFreq: 0.05, maxFreq: 20,  minSyll: 2, maxSyll: 5 },
  street: { label: 'STREET',    cgrams: ['NOM', 'VER'],        minFreq: 1,    maxFreq: 200, minSyll: 1, maxSyll: 3 },
  lyric:  { label: 'LYRIQUE',   cgrams: ['NOM', 'ADJ', 'ADV'], minFreq: 0.1,  maxFreq: 30,  minSyll: 2, maxSyll: 6 },
  rare:   { label: 'MOT RARE',  cgrams: ['NOM', 'ADJ', 'VER'], minFreq: 0.01, maxFreq: 0.5, minSyll: 2, maxSyll: 5 },
}

const DEFAULT_THEME: Theme = THEMES['battle']!

export async function freestyleHandler ({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire est en cours de chargement.' }
  }

  const themeKey = args[1]?.toLowerCase()
  const countArg = args[2] ? parseInt(args[2], 10) : 5
  const count    = isNaN(countArg) || countArg < 1 ? 5 : Math.min(countArg, 12)
  const theme    = (themeKey && THEMES[themeKey]) ? THEMES[themeKey]! : DEFAULT_THEME

  const words = lexiconService.randomWords({
    cgrams:  theme.cgrams,
    minFreq: theme.minFreq,
    maxFreq: theme.maxFreq,
    minSyll: theme.minSyll,
    maxSyll: theme.maxSyll
  }, count)

  if (words.length === 0) {
    return { success: false, msg: 'Impossible de générer des mots pour ce thème.' }
  }

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  const themeNames = Object.keys(THEMES).join(' · ')
  let out = `${CYAN}[ FREESTYLE · ${theme.label} ]${RESET}\n`
  out += `${SEP}\n`
  out += `${BLUE}Thèmes${RESET} : ${CYAN}${themeNames}${RESET}   ${BLUE}Syntaxe${RESET} : .freestyle [thème] [nb]\n`
  out += `${SEP}\n\n`

  const maxLen = Math.max(...words.map(w => w.ortho.length), 6)

  for (const w of words) {
    const suffix = lexiconService.getRimeSuffix(w.ortho) ?? ''
    const word = `${CYAN}${w.ortho.toUpperCase().padEnd(maxLen + 1)}${RESET}`
    const phon = `${CYAN}[${w.phon}]${RESET}`
    const syll = `${BLUE}${w.nbsyll}s${RESET}`
    const rime = suffix ? `  ${BLUE}rime : …${suffix}${RESET}` : ''
    out += `${word} ${phon} ${syll}${rime}\n`
  }

  out += `\n${SEP}\n`
  out += `${BLUE}Contrainte${RESET} : place au moins ${CYAN}${Math.ceil(words.length / 2)} de ces mots${RESET} dans ton freestyle !\n`

  return [`\`\`\`ansi\n${out.trimEnd()}\n\`\`\``]
}
