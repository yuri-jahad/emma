import type { CommandResponse, CommandContext } from '@shared/command/type'
import { definitionApiRepo } from '@features/show-definitions/repository'
import type { DefinitionResult } from '@features/show-definitions/type'
import { LexicService } from './service'
import { ANSI_COLORS, fitsInMessage } from '@shared/utils/text'

const lexicService = new LexicService()

export async function lexicHandler({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  const word = args[1]?.toLowerCase().trim()

  if (!word) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple correct : ".lexic maison"'
    }
  }

  try {
    const [defResultRaw, synonymsRaw, antonymsRaw] = await Promise.allSettled([
      definitionApiRepo(word),
      lexicService.getSynonyms(word),
      lexicService.getAntonyms(word)
    ])

    const defResult = defResultRaw.status === 'fulfilled' ? defResultRaw.value as DefinitionResult : null
    const synList = synonymsRaw.status === 'fulfilled' ? synonymsRaw.value : []
    const antList = antonymsRaw.status === 'fulfilled' ? antonymsRaw.value : []

    const firstDef = defResult?.definitions?.[0]
    const hasDefinition = !!(defResult?.success && firstDef)

    if (!hasDefinition && synList.length === 0 && antList.length === 0) {
      return {
        success: false,
        msg: `Aucune information lexicale trouvée pour le mot "${word}".`
      }
    }

    const CYAN   = ANSI_COLORS.cyan
    const BLUE   = ANSI_COLORS.blue
    const RESET  = '\u001b[0m'
    const SEP    = `${BLUE}${'─'.repeat(38)}${RESET}`

    const actualWord = hasDefinition && defResult.word_details?.word
      ? defResult.word_details.word.toUpperCase()
      : word.toUpperCase()

    let output = `${CYAN}[ LEXIQUE · ${actualWord} ]${RESET}\n${SEP}`

    if (hasDefinition && firstDef) {
      const text = firstDef.definition.length > 300
        ? firstDef.definition.substring(0, 300) + '...'
        : firstDef.definition
      const source = firstDef.source_name
        ? `  ${BLUE}(${firstDef.source_name})${RESET}`
        : ''
      output += `\n\n${CYAN}Définition${RESET}\n${BLUE}${text}${source}${RESET}`
    }

    if (synList.length > 0) {
      const displayed = synList.slice(0, 15)
      const more = synList.length > 15 ? ` ${BLUE}+${synList.length - 15}${RESET}` : ''
      const synWords = displayed.map(s => `${CYAN}${s}${RESET}`).join(`  `)
      output += `\n\n${CYAN}Synonymes ${BLUE}(${synList.length})${RESET}\n${synWords}${more}`
    }

    if (antList.length > 0) {
      const displayed = antList.slice(0, 15)
      const more = antList.length > 15 ? ` ${BLUE}+${antList.length - 15}${RESET}` : ''
      const antWords = displayed.map(a => `${CYAN}${a}${RESET}`).join(`  `)
      output += `\n\n${CYAN}Antonymes ${BLUE}(${antList.length})${RESET}\n${antWords}${more}`
    }

    const ansiMessage = `\`\`\`ansi\n${output.trimEnd()}\n\`\`\``

    if (fitsInMessage(ansiMessage)) {
      return [ansiMessage]
    }

    const messages: string[] = []
    const header = `${CYAN}[ LEXIQUE · ${actualWord} ]${RESET}\n${SEP}`
    let current = header

    if (hasDefinition && firstDef) {
      const text = firstDef.definition.length > 300
        ? firstDef.definition.substring(0, 300) + '...'
        : firstDef.definition
      const source = firstDef.source_name ? `  ${BLUE}(${firstDef.source_name})${RESET}` : ''
      const block = `\n\n${CYAN}Définition${RESET}\n${BLUE}${text}${source}${RESET}`
      const candidate = `\`\`\`ansi\n${current + block}\n\`\`\``
      if (fitsInMessage(candidate)) {
        current += block
      } else {
        messages.push(`\`\`\`ansi\n${current}\n\`\`\``)
        current = block.trimStart()
      }
    }

    if (synList.length > 0) {
      const displayed = synList.slice(0, 15)
      const more = synList.length > 15 ? ` ${BLUE}+${synList.length - 15}${RESET}` : ''
      const synWords = displayed.map(s => `${CYAN}${s}${RESET}`).join(`  `)
      const block = `\n\n${CYAN}Synonymes ${BLUE}(${synList.length})${RESET}\n${synWords}${more}`
      const candidate = `\`\`\`ansi\n${current + block}\n\`\`\``
      if (fitsInMessage(candidate)) {
        current += block
      } else {
        messages.push(`\`\`\`ansi\n${current}\n\`\`\``)
        current = block.trimStart()
      }
    }

    if (antList.length > 0) {
      const displayed = antList.slice(0, 15)
      const more = antList.length > 15 ? ` ${BLUE}+${antList.length - 15}${RESET}` : ''
      const antWords = displayed.map(a => `${CYAN}${a}${RESET}`).join(`  `)
      const block = `\n\n${CYAN}Antonymes ${BLUE}(${antList.length})${RESET}\n${antWords}${more}`
      const candidate = `\`\`\`ansi\n${current + block}\n\`\`\``
      if (fitsInMessage(candidate)) {
        current += block
      } else {
        messages.push(`\`\`\`ansi\n${current}\n\`\`\``)
        current = block.trimStart()
      }
    }

    if (current.trim()) {
      messages.push(`\`\`\`ansi\n${current.trimEnd()}\n\`\`\``)
    }

    return messages

  } catch (error) {
    console.error(`[LexicHandler] Erreur critique avec le mot "${word}":`, error)
    return {
      success: false,
      msg: `Une erreur interne s'est produite lors de la recherche lexicale pour "${word}".`
    }
  }
}
