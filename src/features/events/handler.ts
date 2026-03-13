import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type MessageActionRowComponentBuilder
} from 'discord.js'
import type { CommandContext, CommandResponse } from '@shared/command/type'
import { searchHipHopEvents, buildKeyword } from './service'
import type { HipHopEvent } from './type'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMBED_COLOR_TM  = 0xF4A300  // Gold — Ticketmaster
const EMBED_COLOR_PHQ = 0x7C3AED  // Purple — PredictHQ
const COLLECTOR_TIMEOUT = 5 * 60 * 1000

const STATUS_LABELS: Record<string, string> = {
  onsale:      '🟢 Billets disponibles',
  offsale:     '🔴 Vente terminée',
  cancelled:   '❌ Annulé',
  rescheduled: '🔄 Reporté',
  postponed:   '⏳ Reporté',
  active:      '🟢 Actif'
}

const SOURCE_LABELS: Record<string, string> = {
  ticketmaster: '🎫 Ticketmaster',
  predicthq:    '📡 PredictHQ'
}

// ─── Embed builder ────────────────────────────────────────────────────────────

function buildEmbed (
  events: HipHopEvent[],
  idx: number,
  query: string,
  totalApi: number
): EmbedBuilder {
  const ev = events[idx]!

  const lines: string[] = []

  // Date & time
  if (ev.rawDate) {
    const dateLine = ev.time ? `📅 **${ev.date}** · ⏰ **${ev.time}**` : `📅 **${ev.date}**`
    lines.push(dateLine)
  }

  // Venue
  if (ev.venue) lines.push(`🏟️ ${ev.venue}`)

  // Location
  const location = [ev.city, ev.country].filter(Boolean).join(', ')
  if (location) lines.push(`📍 ${location}`)

  // Genre
  if (ev.genre && ev.genre.toLowerCase() !== 'undefined') lines.push(`🎭 ${ev.genre}`)

  // Artists
  if (ev.artists.length > 0) lines.push(`🎤 ${ev.artists.slice(0, 3).join(', ')}`)

  // Attendance estimate (PredictHQ)
  if (ev.attendance) lines.push(`👥 ~${ev.attendance.toLocaleString('fr-FR')} personnes attendues`)

  // Price
  if (ev.priceMin !== undefined) {
    const cur = ev.currency ?? ''
    const price = ev.priceMax && ev.priceMax !== ev.priceMin
      ? `${ev.priceMin.toFixed(0)} – ${ev.priceMax.toFixed(0)} ${cur}`
      : `${ev.priceMin.toFixed(0)} ${cur}`
    lines.push(`💰 ${price.trim()}`)
  }

  // Status
  const statusLabel = STATUS_LABELS[ev.status]
  if (statusLabel) lines.push(statusLabel)

  // Note / description
  if (ev.note) {
    const truncated = ev.note.length > 150 ? ev.note.slice(0, 147) + '…' : ev.note
    lines.push(`\n> ${truncated}`)
  }

  // Ticket link
  if (ev.ticketUrl) lines.push(`\n🎟️ [Voir les billets](${ev.ticketUrl})`)

  const color = ev.source === 'ticketmaster' ? EMBED_COLOR_TM : EMBED_COLOR_PHQ
  const sourceLabel = SOURCE_LABELS[ev.source] ?? ev.source

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(ev.name.length > 256 ? ev.name.slice(0, 253) + '…' : ev.name)
    .setDescription(lines.join('\n') || '*Informations non disponibles*')
    .setFooter({
      text: `${idx + 1} / ${events.length}  ·  ${sourceLabel}  ·  Recherche : "${query}"`
    })
    .setTimestamp()

  if (ev.imageUrl) embed.setImage(ev.imageUrl)
  if (ev.ticketUrl) embed.setURL(ev.ticketUrl)

  return embed
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow (
  idx: number,
  total: number
): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const first = new ButtonBuilder()
    .setCustomId('ev_first')
    .setEmoji('⏮️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === 0)

  const prev = new ButtonBuilder()
    .setCustomId('ev_prev')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === 0)

  const counter = new ButtonBuilder()
    .setCustomId('ev_count')
    .setLabel(`${idx + 1} / ${total}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)

  const next = new ButtonBuilder()
    .setCustomId('ev_next')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === total - 1)

  const last = new ButtonBuilder()
    .setCustomId('ev_last')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === total - 1)

  return new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(first, prev, counter, next, last)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function eventsHandler ({
  args,
  message,
  bot,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  if (!message.channel.isSendable()) {
    return { success: false, msg: 'Canal non accessible.' }
  }

  const rawArgs = args.slice(1)
  const keyword = buildKeyword(rawArgs)
  const displayQuery = rawArgs.join(' ') || 'hip hop battle'

  await message.channel.sendTyping()

  let events: HipHopEvent[]
  let total: number

  try {
    const result = await searchHipHopEvents(keyword, 40)
    events = result.events
    total  = result.total
  } catch (err) {
    console.error('[EventsHandler]', err)
    return {
      success: false,
      msg: "Impossible de contacter l'API d'événements. Vérifie ta connexion ou réessaie dans un instant."
    }
  }

  if (events.length === 0) {
    return {
      success: false,
      msg: `Aucun événement trouvé pour **"${displayQuery}"**.\nEssaie une autre ville, un autre tag ou simplement \`.battle\` pour voir tous les événements hip-hop.`
    }
  }

  let idx = 0

  const sent = await message.channel.send({
    embeds:     [buildEmbed(events, idx, displayQuery, total)],
    components: events.length > 1 ? [buildRow(idx, events.length)] : []
  })

  if (events.length <= 1) return []

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_TIMEOUT
  })

  collector.on('collect', async interaction => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: '🚫 Ce menu ne t\'appartient pas.', ephemeral: true })
      return
    }

    if      (interaction.customId === 'ev_first') idx = 0
    else if (interaction.customId === 'ev_prev')  idx = Math.max(0, idx - 1)
    else if (interaction.customId === 'ev_next')  idx = Math.min(events.length - 1, idx + 1)
    else if (interaction.customId === 'ev_last')  idx = events.length - 1

    await interaction.update({
      embeds:     [buildEmbed(events, idx, displayQuery, total)],
      components: [buildRow(idx, events.length)]
    })
  })

  collector.on('end', async () => {
    try {
      await sent.edit({ components: [] })
    } catch { /* message may have been deleted */ }
  })

  return []
}
