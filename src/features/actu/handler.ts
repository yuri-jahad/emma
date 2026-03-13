import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  type MessageActionRowComponentBuilder
} from 'discord.js'
import type { CommandContext, CommandResponse } from '@shared/command/type'
import { fetchNews } from './service'
import type { NewsItem } from './service'

const EMBED_COLOR  = 0xE63946
const TIMEOUT      = 5 * 60 * 1000

const SOURCE_COLORS: Record<string, number> = {
  'HipHop.fr': 0xE63946,
  'Rap2K':     0xFF6B35,
  'Mouv':      0x8B5CF6,
}

function buildEmbed (items: NewsItem[], idx: number): EmbedBuilder {
  const item = items[idx]!

  const embed = new EmbedBuilder()
    .setColor(SOURCE_COLORS[item.source] ?? EMBED_COLOR)
    .setTitle(item.title.length > 256 ? item.title.slice(0, 253) + '…' : item.title)
    .setURL(item.link)
    .setFooter({ text: `${idx + 1} / ${items.length}  ·  ${item.source}` })
    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date())

  if (item.description) embed.setDescription(item.description + (item.description.length >= 200 ? '…' : ''))
  if (item.imageUrl)    embed.setImage(item.imageUrl)
  if (item.link)        embed.setAuthor({ name: `📰 ${item.source}`, url: item.link })

  return embed
}

function buildRow (idx: number, total: number): ActionRowBuilder<MessageActionRowComponentBuilder> {
  const prev = new ButtonBuilder()
    .setCustomId('actu_prev')
    .setEmoji('◀️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === 0)

  const counter = new ButtonBuilder()
    .setCustomId('actu_count')
    .setLabel(`${idx + 1} / ${total}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)

  const next = new ButtonBuilder()
    .setCustomId('actu_next')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(idx === total - 1)

  const link = new ButtonBuilder()
    .setLabel('Lire l\'article')
    .setStyle(ButtonStyle.Link)
    .setURL(/* set dynamically */ 'https://hiphop.fr')

  return new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(prev, counter, next)
}

export async function actuHandler ({
  message,
  bot,
  clientGuard
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  if (!message.channel.isSendable()) return { success: false, msg: 'Canal non accessible.' }

  await message.channel.sendTyping()

  let items: NewsItem[]
  try {
    items = await fetchNews()
  } catch (err) {
    console.error('[ActuHandler]', err)
    return { success: false, msg: 'Impossible de récupérer les actualités. Réessaie plus tard.' }
  }

  if (items.length === 0) {
    return { success: false, msg: 'Aucune actualité disponible pour le moment.' }
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
    if (interaction.customId === 'actu_prev') idx = Math.max(0, idx - 1)
    if (interaction.customId === 'actu_next') idx = Math.min(items.length - 1, idx + 1)
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
