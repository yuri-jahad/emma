import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type MessageActionRowComponentBuilder
} from 'discord.js'
import { CommandService } from '@shared/command/service'
import type { CommandResponse, CommandContext, CommandModel } from '@shared/command/type'

// ─── Pages definition ─────────────────────────────────────────────────────────
// Each page groups one or more categories.

const PAGES: { emoji: string; label: string; keys: string[] }[][] = [
  // Page 1 — Linguistique
  [
    { emoji: '🔤', label: 'LINGUISTIQUE', keys: ['c', 's', 'd', 'pick', 'phon', 'rime', 'vers', 'freq', 'homo'] }
  ],
  // Page 2 — Création & Jeux
  [
    { emoji: '🎤', label: 'CRÉATION',     keys: ['freestyle', 'lexic'] },
    { emoji: '🎮', label: 'JEUX',         keys: ['dg', 'sg', 'rep', 'rimgame'] }
  ],
  // Page 3 — Culture & Actu
  [
    { emoji: '🥊', label: 'ÉVÉNEMENTS',   keys: ['battle'] },
    { emoji: '📰', label: 'ACTUALITÉS',   keys: ['actu'] },
    { emoji: '🎌', label: 'MANGA & ANIMÉ',keys: ['manga'] }
  ],
  // Page 4 — Profil & Listes
  [
    { emoji: '📝', label: 'MA LISTE',     keys: ['ml', 'mla', 'mld'] },
    { emoji: '📊', label: 'PROFIL',       keys: ['vl', 'stats'] }
  ],
  // Page 5 — Culture & Divers
  [
    { emoji: '☪️', label: 'ISLAMIQUE',    keys: ['surah'] },
    { emoji: '🎮', label: 'POKÉMON',      keys: ['pokemon'] }
  ],
  // Page 6 — Système & Admin
  [
    { emoji: '⚙️', label: 'SYSTÈME',     keys: ['uptime', 'computer', 'id'] },
    { emoji: '🛡️', label: 'ADMINISTRATION', keys: ['mute', 'unmute', 'addchannel', 'deletechannel', 'listguilds'] },
    { emoji: '❓', label: 'AIDE',         keys: ['help'] }
  ]
]

// ─── Embed builder ────────────────────────────────────────────────────────────

function buildPage (
  pageGroups: { emoji: string; label: string; keys: string[] }[],
  allCmds: Map<string, CommandModel>,
  pageIdx: number,
  totalPages: number
): EmbedBuilder {
  const lines: string[] = []

  for (const group of pageGroups) {
    const cmds = group.keys
      .map(k => allCmds.get(k))
      .filter((c): c is CommandModel => c != null)
      .filter((c, i, arr) => arr.findIndex(x => x === c) === i)   // deduplicate

    if (cmds.length === 0) continue

    lines.push(`**${group.emoji}  ${group.label}**`)

    for (const cmd of cmds) {
      const [main, ...aliases] = cmd.variants
      const trigger  = `\`.${main}\``
      const aliasStr = aliases.length > 0
        ? `  /  ${aliases.slice(0, 2).map(a => `\`.${a}\``).join('  /  ')}`
        : ''
      lines.push(`${trigger}${aliasStr}\n╰ ${cmd.helper}`)
    }

    lines.push('')
  }

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📖  AIDE DU BOT')
    .setDescription(lines.join('\n').trim() || '*Aucune commande disponible.*')
    .setFooter({ text: `Page ${pageIdx + 1} / ${totalPages}  ·  ◀ ▶ pour naviguer` })
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow (
  idx: number,
  total: number
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId('help_prev')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === 0)

  const counter = new ButtonBuilder()
    .setCustomId('help_count')
    .setLabel(`${idx + 1} / ${total}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)

  const next = new ButtonBuilder()
    .setCustomId('help_next')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === total - 1)

  return new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(prev, counter, next)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function helpHandler ({
  message
}: CommandContext): Promise<CommandResponse | string[]> {
  if (!message.channel.isSendable()) {
    return { success: false, msg: 'Canal non accessible.' }
  }

  const allCmds = CommandService.getInstance().commands

  const validPages = PAGES.filter(groups =>
    groups.some(g => g.keys.some(k => allCmds.has(k)))
  )

  if (validPages.length === 0) {
    return { success: false, msg: 'Aucune commande disponible.' }
  }

  let idx = 0

  const sent = await message.channel.send({
    embeds:     [buildPage(validPages[idx]!, allCmds, idx, validPages.length)],
    components: validPages.length > 1 ? [buildRow(idx, validPages.length)] : []
  })

  if (validPages.length <= 1) return []

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000
  })

  collector.on('collect', async interaction => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: '🚫 Ce menu ne t\'appartient pas.', ephemeral: true })
      return
    }
    if (interaction.customId === 'help_prev') idx = Math.max(0, idx - 1)
    if (interaction.customId === 'help_next') idx = Math.min(validPages.length - 1, idx + 1)
    await interaction.update({
      embeds:     [buildPage(validPages[idx]!, allCmds, idx, validPages.length)],
      components: [buildRow(idx, validPages.length)]
    })
  })

  collector.on('end', async () => {
    try { await sent.edit({ components: [] }) } catch {}
  })

  return []
}
