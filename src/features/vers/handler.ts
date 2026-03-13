import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'
import { cleanAccents } from '@shared/utils/text'

const CGRAM_SHORT: Record<string, string> = {
  NOM: 'n.', VER: 'v.', ADJ: 'adj.', ADV: 'adv.',
  PRE: 'prép.', ART: 'art.', PRO: 'pro.', CON: 'conj.',
  ONO: 'ono.', AUX: 'aux.'
}

// Strip French elision prefixes: j', l', d', qu', c', m', t', s', n'
const ELISION_RE = /^(?:j|l|d|qu|c|m|t|s|n)'/i

// Strip punctuation from start/end of token
function cleanToken (token: string): string {
  return token
    .replace(/^[«»"''"([\-–—]+/, '')
    .replace(/[«»"''")\],.!?;:…\-–—]+$/, '')
    .toLowerCase()
}

function tokenize (text: string): string[] {
  return text.trim().split(/\s+/).flatMap(raw => {
    const clean = cleanToken(raw)
    if (!clean) return []
    // Handle elision: j'arrive → arrive
    const match = clean.match(ELISION_RE)
    if (match) return [clean.slice(match[0].length)]
    return [clean]
  }).filter(Boolean)
}

export async function versHandler ({
  message
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire est en cours de chargement.' }
  }

  const raw = message.content
  const spaceIdx = raw.indexOf(' ')
  const verseText = spaceIdx !== -1 ? raw.slice(spaceIdx + 1).trim() : ''

  if (!verseText) {
    return {
      success: false,
      msg: 'Utilisation : `.vers <ton texte>`  —  ex: `.vers j\'arrive en silence comme une brise de vent`'
    }
  }

  const tokens   = tokenize(verseText)
  if (tokens.length === 0) {
    return { success: false, msg: 'Aucun mot analysable dans ce texte.' }
  }

  type TokenResult = {
    raw: string
    phon: string
    nbsyll: number
    cgram: string
    found: boolean
  }

  const results: TokenResult[] = tokens.map(tok => {
    const entry = lexiconService.getWord(cleanAccents(tok))
    if (!entry) return { raw: tok, phon: '?', nbsyll: 0, cgram: '', found: false }
    return { raw: tok, phon: entry.phon, nbsyll: entry.nbsyll, cgram: entry.cgram, found: true }
  })

  const totalSyll  = results.reduce((s, r) => s + r.nbsyll, 0)
  const foundCount = results.filter(r => r.found).length

  // Detect internal rhymes: group tokens by rhyme suffix
  const suffixGroups = new Map<string, number[]>()
  results.forEach((r, i) => {
    if (!r.found) return
    const suffix = lexiconService.getRimeSuffix(cleanAccents(r.raw))
    if (suffix && suffix.length >= 2) {
      const arr = suffixGroups.get(suffix) ?? []
      arr.push(i)
      suffixGroups.set(suffix, arr)
    }
  })
  const rhymeIndices = new Set<number>()
  for (const [, indices] of suffixGroups) {
    if (indices.length > 1) indices.forEach(i => rhymeIndices.add(i))
  }

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(42)}${RESET}`

  // Truncate display for long verses
  const displayVerse = verseText.length > 80
    ? verseText.slice(0, 77) + '…'
    : verseText

  let out = `${CYAN}[ ANALYSE DE VERS ]${RESET}\n`
  out += `${SEP}\n`
  out += `${CYAN}"${displayVerse}"${RESET}\n`
  out += `${BLUE}Total${RESET} : ${CYAN}${totalSyll} syllabe${totalSyll > 1 ? 's' : ''}${RESET}   `
  out += `${BLUE}Mots trouvés${RESET} : ${foundCount}/${results.length}\n`
  out += `${SEP}\n\n`

  const maxWordLen = Math.max(...results.map(r => r.raw.length), 6)
  const maxPhonLen = Math.max(...results.filter(r => r.found).map(r => r.phon.length), 4)

  for (const r of results) {
    const hasRhyme = rhymeIndices.has(results.indexOf(r))
    const word = `${CYAN}${r.raw.toUpperCase().padEnd(maxWordLen + 1)}${RESET}`

    if (!r.found) {
      out += `${word} ${BLUE}[?]${RESET}\n`
    } else {
      const phon = `${CYAN}[${r.phon.padEnd(maxPhonLen)}]${RESET}`
      const syll = `${BLUE}${String(r.nbsyll).padStart(1)}s${RESET}`
      const cat  = r.cgram ? `${BLUE}${CGRAM_SHORT[r.cgram] ?? r.cgram}${RESET}` : ''
      const rhymeTag = hasRhyme ? ` ${CYAN}♪${RESET}` : ''
      out += `${word} ${phon} ${syll}  ${cat}${rhymeTag}\n`
    }
  }

  // Last word rhyme hint
  const lastFound = [...results].reverse().find(r => r.found)
  if (lastFound) {
    const suffix = lexiconService.getRimeSuffix(cleanAccents(lastFound.raw))
    if (suffix) {
      out += `\n${SEP}\n`
      out += `${BLUE}Rime finale${RESET} : ${CYAN}…${suffix}${RESET}  `
      out += `${BLUE}→ cherche${RESET} : ${CYAN}.rime ${lastFound.raw}${RESET}\n`
    }
  }

  const msg = `\`\`\`ansi\n${out.trimEnd()}\n\`\`\``
  if (fitsInMessage(msg)) return [msg]

  // Split: header + rows in chunks
  const headerEnd = out.indexOf('\n\n') + 2
  const header    = out.slice(0, headerEnd)
  const body      = out.slice(headerEnd)
  return [
    `\`\`\`ansi\n${header.trimEnd()}\n\`\`\``,
    `\`\`\`ansi\n${body.trimEnd()}\n\`\`\``
  ]
}
