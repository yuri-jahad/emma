import { definitionApiRepo } from '@features/show-definitions/repository'
import type { DefinitionResult } from '@features/show-definitions/type'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { COLORS_MESSAGE, fitsInMessage } from '@shared/utils/text'

export async function showDefinitionsHandler({
  args
}: CommandContext): Promise<CommandResponse | string[]> {
  const word = args[1]
  const rawLimit = args[2] ? parseInt(args[2], 10) : 3
  const limit = isNaN(rawLimit) ? 3 : Math.min(Math.max(rawLimit, 1), 10)

  if (!word) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple correct : ".def maison" ou ".def maison 5" (limite optionnelle).'
    }
  }

  if (args[2] && isNaN(rawLimit)) {
    return {
      success: false,
      msg: `La limite "${args[2]}" n'est pas un nombre valide. Utilisez ".def ${word} 3".`
    }
  }

  try {
    const result = (await definitionApiRepo(word)) as DefinitionResult | null

    if (!result || !result.success || !result.definitions?.length) {
      return {
        success: false,
        msg: `Je n'ai trouvé aucune définition pour le mot "${word}".`
      }
    }

    const { word_details, definitions } = result
    const displayDefs = definitions.slice(0, limit)

    const sourceColor = COLORS_MESSAGE.colors['blue']
    const defaultColor = COLORS_MESSAGE.colors['cyan']

    const headerColor = COLORS_MESSAGE.colors['blue']
    const header = `${headerColor}\u001b[1m${definitions.length} ${
      definitions.length > 1 ? 'définitions trouvées -' : 'définition trouvée -'
    } ${displayDefs.length} affichée(s) (${word_details.word.toUpperCase()})\u001b[0m`

    const formattedDefs = displayDefs.map((def, index) => {
      const text =
        def.definition.length > 280
          ? def.definition.substring(0, 280) + '...'
          : def.definition

      const source = def.source_name
        ? ` - ${sourceColor}${def.source_name}${defaultColor}`
        : ''

      return `${defaultColor}${index + 1}. ${text}${source}`
    })

    const fullOutput = header + '\n\n' + formattedDefs.join('\n\n')
    const ansiMessage = `\`\`\`ansi\n${fullOutput.trimEnd()}\n\`\`\``

    if (fitsInMessage(ansiMessage)) {
      return [ansiMessage]
    }

    const messages: string[] = []
    let currentOutput = header + '\n\n'

    for (const def of formattedDefs) {
      const candidate = currentOutput + def + '\n\n'
      const candidateMsg = `\`\`\`ansi\n${candidate.trimEnd()}\n\`\`\``
      if (!fitsInMessage(candidateMsg) && currentOutput !== header + '\n\n') {
        messages.push(`\`\`\`ansi\n${currentOutput.trimEnd()}\n\`\`\``)
        currentOutput = def + '\n\n'
      } else {
        currentOutput = candidate
      }
    }

    if (currentOutput.trim()) {
      messages.push(`\`\`\`ansi\n${currentOutput.trimEnd()}\n\`\`\``)
    }

    return messages
  } catch (error) {
    console.error(
      `[ShowDefinitions] Erreur critique avec le mot "${word}":`,
      error
    )
    return {
      success: false,
      msg: `Une erreur interne s'est produite lors de la recherche de la définition pour "${word}".`
    }
  }
}
