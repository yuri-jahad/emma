import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type MessageActionRowComponentBuilder
} from 'discord.js'
import type { CommandContext, CommandResponse } from '@shared/command/type'
import { fetchLatest, cleanDesc, hexColor, formatCountdown } from './service'
import type { AniListMedia, MediaType } from './service'

const TIMEOUT = 5 * 60 * 1000

// ─── Embed ────────────────────────────────────────────────────────────────────

function buildEmbed (items: AniListMedia[], idx: number): EmbedBuilder {
  const m = items[idx]!
  const title = m.title.english ?? m.title.romaji

  const meta: string[] = []
  if (m.type === 'ANIME' && m.episodes)  meta.push(`${m.episodes} épisodes`)
  if (m.type === 'MANGA' && m.chapters)  meta.push(`${m.chapters} chapitres`)
  if (m.averageScore)                    meta.push(`⭐ ${(m.averageScore / 10).toFixed(1)}`)
  if (m.genres.length)                   meta.push(m.genres.slice(0, 3).join(' · '))

  const lines: string[] = [cleanDesc(m.description)]
  if (meta.length)  lines.push(`\n${meta.join('  ·  ')}`)
  if (m.nextAiringEpisode) {
    const { episode, timeUntilAiring } = m.nextAiringEpisode
    lines.push(`📅 Épisode **${episode}** — ${formatCountdown(timeUntilAiring)}`)
  }
  lines.push(`\n🔗 [Voir sur AniList](${m.siteUrl})`)

  const typeLabel = m.type === 'ANIME' ? '📺 ANIME' : '📖 MANGA'

  return new EmbedBuilder()
    .setColor(hexColor(m.coverImage.color))
    .setAuthor({ name: typeLabel })
    .setTitle(title.length > 256 ? title.slice(0, 253) + '…' : title)
    .setURL(m.siteUrl)
    .setThumbnail(m.coverImage.extraLarge)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${idx + 1} / ${items.length}  ·  AniList` })
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function buildRow (idx: number, total: number): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId('mg_prev').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(idx === 0)
  const counter = new ButtonBuilder()
    .setCustomId('mg_count').setLabel(`${idx + 1} / ${total}`).setStyle(ButtonStyle.Primary).setDisabled(true)
  const next = new ButtonBuilder()
    .setCustomId('mg_next').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(idx === total - 1)

  return new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(prev, counter, next)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function mangaHandler ({
  args, message, bot, clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard
  if (!message.channel.isSendable()) return { success: false, msg: 'Canal non accessible.' }

  // `.manga` / `.anime` → type forced by command variant
  // `.manga <search>` or `.anime <search>` → search
  const cmdName  = (args[0] ?? '').replace(/^[./]/, '')
  const baseType: MediaType = cmdName === 'anime' ? 'ANIME' : 'MANGA'
  const search   = args.slice(1).join(' ').trim() || undefined

  await message.channel.sendTyping()

  let items: AniListMedia[]
  try {
    items = await fetchLatest(baseType, search)
  } catch (err) {
    console.error('[MangaHandler]', err)
    return { success: false, msg: 'Impossible de contacter AniList. Réessaie dans un instant.' }
  }

  if (items.length === 0) {
    return {
      success: false,
      msg: search
        ? `Aucun résultat pour **"${search}"**.`
        : 'Aucune sortie récente disponible.'
    }
  }

  let idx = 0

  const sent = await message.channel.send({
    embeds:     [buildEmbed(items, idx)],
    components: items.length > 1 ? [buildRow(idx, items.length)] : []
  })

  if (items.length <= 1) return []

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: TIMEOUT
  })

  collector.on('collect', async interaction => {
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: '🚫 Ce menu ne t\'appartient pas.', ephemeral: true })
      return
    }
    if (interaction.customId === 'mg_prev') idx = Math.max(0, idx - 1)
    if (interaction.customId === 'mg_next') idx = Math.min(items.length - 1, idx + 1)
    await interaction.update({
      embeds:     [buildEmbed(items, idx)],
      components: [buildRow(idx, items.length)]
    })
  })

  collector.on('end', async () => {
    try { await sent.edit({ components: [] }) } catch {}
  })

  return []
}
