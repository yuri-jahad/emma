import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'
import { definitionApiRepo } from '@features/show-definitions/repository'
import type { DefinitionResult } from '@features/show-definitions/type'
import { sessions, clearSession } from './session'
import type { SendableChannel } from './session'

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function sanitizeWord(text: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), '★★★')
}

function buildHint(word: string): string {
  const first = word[0] ?? '?'
  return first.toUpperCase() + ' ' + Array(word.length - 1).fill('_').join(' ')
}

export async function defGameHandler({
  args,
  bot,
  message,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  const channelId = message.channelId
  if (sessions.has(channelId)) {
    return {
      success: false,
      msg: "Une partie est déjà en cours dans ce salon. Utilise `.rep <mot>` pour répondre !"
    }
  }

  const starterId = message.author.id
  const targetUsername = args[1]

  let wordPool: string[]
  let listOwnerUsername: string

  if (targetUsername) {
    const userIds = bot.users.getIdByName(targetUsername)
    if (!userIds || userIds.length === 0) {
      return {
        success: false,
        msg: `Aucun utilisateur nommé "${targetUsername}" n'a été trouvé.`
      }
    }
    if (userIds.length > 1) {
      return {
        success: false,
        msg: `Plusieurs utilisateurs correspondent à "${targetUsername}". Soyez plus précis.`
      }
    }
    const targetUser = bot.users.getUser(userIds[0]!)
    if (!targetUser?.list || targetUser.list.length === 0) {
      return {
        success: false,
        msg: `La liste de "${targetUsername}" est vide.`
      }
    }
    wordPool = targetUser.list
    listOwnerUsername = targetUser.username
  } else {
    const starterUser = bot.users.getUser(starterId)
    if (!starterUser?.list || starterUser.list.length === 0) {
      return {
        success: false,
        msg: 'Ta liste personnelle est vide. Ajoute des mots avec `.add <mot>` !'
      }
    }
    wordPool = starterUser.list
    listOwnerUsername = starterUser.username
  }

  let chosenWord: string | null = null
  let result: DefinitionResult | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = pickRandom(wordPool)
    try {
      const data = (await definitionApiRepo(candidate)) as DefinitionResult | null
      if (data?.success && data.definitions?.length > 0) {
        chosenWord = data.word_details?.word ?? candidate
        result = data
        break
      }
    } catch {
    }
  }

  if (!chosenWord || !result || result.definitions.length === 0) {
    return {
      success: false,
      msg: 'Impossible de trouver un mot avec des définitions dans cette liste. Réessaie !'
    }
  }

  const CYAN = ANSI_COLORS.cyan
  const BLUE = ANSI_COLORS.blue
  const RESET = '\u001b[0m'

  const def = result.definitions[0]!
  const sanitizedDef = sanitizeWord(def.definition, chosenWord)
  const displayWord = chosenWord
  const normalizedWord = cleanAccents(chosenWord.toLowerCase())

  const questionContent =
    `${CYAN}[ JEU DE DÉFINITIONS · ${listOwnerUsername.toUpperCase()} ]${RESET}\n\n` +
    `${BLUE}Définition :${RESET}\n${sanitizedDef}\n\n` +
    `${CYAN}Réponds avec \`.rep <mot>\` — 30 secondes !${RESET}`

  const channel = message.channel as SendableChannel

  const hintTimer = setTimeout(async () => {
    if (!sessions.has(channelId)) return
    const hint = buildHint(displayWord)
    const hintContent =
      `${CYAN}[ INDICE ]${RESET}\n\n` +
      `${BLUE}Première lettre + longueur :${RESET} ${CYAN}${hint}${RESET}\n` +
      `${BLUE}(${displayWord.length} lettre${displayWord.length > 1 ? 's' : ''})${RESET}`
    await channel.send(`\`\`\`ansi\n${hintContent}\n\`\`\``)
  }, 15000)

  const gameTimer = setTimeout(async () => {
    if (!sessions.has(channelId)) return
    clearSession(channelId)

    await bot.users.updateDefGame(starterId, 'played')

    const timeoutContent =
      `${CYAN}[ TEMPS ÉCOULÉ ! ]${RESET}\n\n` +
      `${BLUE}Le mot était :${RESET} ${CYAN}${displayWord.toUpperCase()}${RESET}\n\n` +
      `${BLUE}Personne n'a trouvé. Bonne chance la prochaine fois !${RESET}`

    await channel.send(`\`\`\`ansi\n${timeoutContent}\n\`\`\``)
  }, 30000)

  sessions.set(channelId, {
    type: 'def',
    displayWord,
    normalizedWord,
    starterId,
    channel,
    hintTimer,
    gameTimer
  })

  return [`\`\`\`ansi\n${questionContent}\n\`\`\``]
}
