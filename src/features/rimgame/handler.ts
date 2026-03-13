import { ComponentType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js'
import type { MessageActionRowComponentBuilder } from 'discord.js'
import type { CommandResponse, CommandContext } from '@shared/command/type'
import { lexiconService } from '@features/lexicon/service'
import { ANSI_COLORS } from '@shared/utils/text'
import { cleanAccents } from '@shared/utils/text'

// ─── Session store (one game per channel) ─────────────────────────────────────

const activeSessions = new Set<string>()

// ─── Game config ──────────────────────────────────────────────────────────────

const GAME_DURATION = 45_000   // 45 seconds
const MIN_RHYMES    = 5        // minimum rhyme candidates required for a word to be used

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function rimgameHandler ({
  message,
  bot,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  if (!lexiconService.loaded) {
    return { success: false, msg: 'Le dictionnaire est en cours de chargement.' }
  }

  if (!message.channel.isSendable()) {
    return { success: false, msg: 'Canal non accessible.' }
  }

  const channelId = message.channelId
  if (activeSessions.has(channelId)) {
    return { success: false, msg: 'Un jeu de rimes est déjà en cours dans ce canal ! Attends qu\'il se termine.' }
  }

  // Pick a word that has enough rhyme candidates
  let challengeWord = null as ReturnType<typeof lexiconService.getWord> | null
  let rhymeSuffix   = ''
  let rhymeCount    = 0

  for (let attempt = 0; attempt < 30; attempt++) {
    const [candidate] = lexiconService.randomWords({
      cgrams: ['NOM', 'VER', 'ADJ'],
      minFreq: 1,
      maxFreq: 300,
      minSyll: 2,
      maxSyll: 4
    }, 1)
    if (!candidate) continue

    const suffix = lexiconService.getRimeSuffix(candidate.ortho)
    if (!suffix || suffix.length < 2) continue

    const rhymes = lexiconService.getRhymes(candidate.ortho)
    if (rhymes.length < MIN_RHYMES) continue

    challengeWord = candidate
    rhymeSuffix   = suffix
    rhymeCount    = rhymes.length
    break
  }

  if (!challengeWord) {
    return { success: false, msg: 'Impossible de préparer le jeu. Réessaie.' }
  }

  activeSessions.add(channelId)

  const CYAN   = ANSI_COLORS.cyan
  const BLUE   = ANSI_COLORS.blue
  const RESET  = '\u001b[0m'
  const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

  const challengeOrtho = challengeWord.ortho

  const introText =
    `${CYAN}[ JEU DE RIMES ]${RESET}\n` +
    `${SEP}\n` +
    `${BLUE}Mot${RESET} : ${CYAN}${challengeOrtho.toUpperCase()}${RESET}  ${CYAN}[${challengeWord.phon}]${RESET}\n` +
    `${BLUE}Rime cible${RESET} : ${CYAN}…${rhymeSuffix}${RESET}   ${BLUE}(${rhymeCount} rimes possibles)${RESET}\n` +
    `${SEP}\n` +
    `${CYAN}Sois le premier à poster un mot qui rime !${RESET}\n` +
    `${BLUE}Durée${RESET} : ${CYAN}45 secondes${RESET}  ·  ${BLUE}Règle${RESET} : mot différent, valide en français\n`

  const stopBtn = new ButtonBuilder()
    .setCustomId('rg_stop')
    .setLabel('Abandonner')
    .setStyle(ButtonStyle.Danger)

  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(stopBtn)

  const gameMsg = await message.channel.send({
    content: `\`\`\`ansi\n${introText.trimEnd()}\n\`\`\``,
    components: [row]
  })

  // Track scores per player
  const scores = new Map<string, { name: string; count: number; words: string[] }>()
  const usedWords = new Set<string>([challengeOrtho.toLowerCase()])
  let finished = false

  function endGame (winner?: { id: string; name: string; word: string }) {
    if (finished) return
    finished = true
    activeSessions.delete(channelId)
    msgCollector.stop()
    btnCollector.stop()
  }

  // Message collector — listens for rhymes
  const msgCollector = message.channel.createMessageCollector({
    filter: m => !m.author.bot && !m.content.startsWith('.'),
    time:   GAME_DURATION
  })

  // Button collector — abandon
  const btnCollector = gameMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: GAME_DURATION
  })

  btnCollector.on('collect', async interaction => {
    if (interaction.customId !== 'rg_stop') return
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: 'Seul celui qui a lancé le jeu peut l\'abandonner.', ephemeral: true })
      return
    }
    await interaction.update({ components: [] })
    endGame()
  })

  msgCollector.on('collect', async msg => {
    if (finished) return

    const word = cleanAccents(msg.content.trim().split(/\s+/)[0] ?? '').toLowerCase()
    if (!word || usedWords.has(word)) return

    const entry = lexiconService.getWord(word)
    if (!entry) return   // not a valid French word

    const suffix = lexiconService.getRimeSuffix(word)
    if (!suffix || !entry.phon.endsWith(rhymeSuffix)) return  // doesn't rhyme

    usedWords.add(word)

    const player = scores.get(msg.author.id) ?? { name: msg.author.username, count: 0, words: [] }
    player.count++
    player.words.push(entry.ortho)
    scores.set(msg.author.id, player)

    const suffix2 = lexiconService.getRimeSuffix(entry.ortho) ?? rhymeSuffix
    await msg.react('✅')

    // Announce valid rhyme inline
    const announcement =
      `${CYAN}✓ ${entry.ortho.toUpperCase()}${RESET}  ${CYAN}[${entry.phon}]${RESET}` +
      `  ${BLUE}rime : …${suffix2}${RESET}  ·  ${CYAN}${msg.author.username}${RESET} +1`
    if (message.channel.isSendable()) {
      await message.channel.send(`\`\`\`ansi\n${announcement}\n\`\`\``)
    }
  })

  msgCollector.on('end', async () => {
    finished = true
    activeSessions.delete(channelId)

    try {
      await gameMsg.edit({ components: [] })
    } catch {}

    if (!message.channel.isSendable()) return

    const players = [...scores.values()].sort((a, b) => b.count - a.count)

    if (players.length === 0) {
      const noone =
        `${CYAN}[ TEMPS ÉCOULÉ ]${RESET}\n` +
        `${SEP}\n` +
        `${BLUE}Personne n'a trouvé de rime pour${RESET} ${CYAN}${challengeOrtho.toUpperCase()} [${challengeWord!.phon}]${RESET}\n` +
        `${BLUE}Rime cible${RESET} : ${CYAN}…${rhymeSuffix}${RESET}`
      await message.channel.send(`\`\`\`ansi\n${noone}\n\`\`\``)
      return
    }

    let result =
      `${CYAN}[ FIN DU JEU ]${RESET}\n` +
      `${SEP}\n` +
      `${BLUE}Mot de départ${RESET} : ${CYAN}${challengeOrtho.toUpperCase()} [${challengeWord!.phon}]${RESET}\n` +
      `${SEP}\n\n`

    players.forEach((p, i) => {
      const medal = i === 0 ? `${CYAN}🥇${RESET}` : i === 1 ? `${BLUE}🥈${RESET}` : `🥉`
      result += `${medal} ${CYAN}${p.name}${RESET} — ${CYAN}${p.count} rime${p.count > 1 ? 's' : ''}${RESET} : ${p.words.slice(0, 5).join(', ')}\n`
    })

    await message.channel.send(`\`\`\`ansi\n${result.trimEnd()}\n\`\`\``)
  })

  return []
}
