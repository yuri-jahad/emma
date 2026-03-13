import type { CommandContext, CommandResponse } from '@shared/command/type'
import { ANSI_COLORS, cleanAccents } from '@shared/utils/text'

const TYPE_FR: Record<string, string> = {
  normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik',
  grass: 'Plante', ice: 'Glace', fighting: 'Combat', poison: 'Poison',
  ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
  rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres',
  steel: 'Acier', fairy: 'Fée'
}

const STAT_LABEL: Record<string, string> = {
  hp: 'PV    ',
  attack: 'ATQ   ',
  defense: 'DEF   ',
  'special-attack': 'SP.ATQ',
  'special-defense': 'SP.DEF',
  speed: 'VIT   '
}

function statBar(value: number, length = 12): string {
  const filled = Math.round((value / 255) * length)
  return '▓'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(length - filled, 0))
}

interface PokeData {
  id: number
  name: string
  height: number
  weight: number
  types: { type: { name: string } }[]
  stats: { base_stat: number; stat: { name: string } }[]
  sprites: { other: { 'official-artwork': { front_default: string } } }
}

interface PokeSpecies {
  names: { name: string; language: { name: string } }[]
  flavor_text_entries: { flavor_text: string; language: { name: string }; version: { name: string } }[]
  genera: { genus: string; language: { name: string } }[]
}

export async function pokemonHandler({
  args,
  clientGuard,
  bot,
  message
}: CommandContext): Promise<CommandResponse | string[]> {
  const guard = clientGuard(bot, message.author.id, ['user'])
  if (!guard.success) return guard

  const query = args.slice(1).join('-').trim().toLowerCase()
  if (!query) {
    return {
      success: false,
      msg: 'Utilisation invalide. Exemple : `.pokemon pikachu` ou `.pokemon 25`'
    }
  }

  const normalized = cleanAccents(query)

  try {
    const [pokeRes, speciesRes] = await Promise.allSettled([
      fetch(`https://pokeapi.co/api/v2/pokemon/${normalized}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${normalized}`)
    ])

    if (pokeRes.status === 'rejected' || !pokeRes.value.ok) {
      return {
        success: false,
        msg: `Aucun Pokémon trouvé pour "${query}". Vérifie le nom ou le numéro.`
      }
    }

    const poke = await pokeRes.value.json() as PokeData
    const species = speciesRes.status === 'fulfilled' && speciesRes.value.ok
      ? await speciesRes.value.json() as PokeSpecies
      : null

    const frName = species?.names.find(n => n.language.name === 'fr')?.name ?? poke.name
    const genus = species?.genera.find(g => g.language.name === 'fr')?.genus ?? ''
    const flavor = species?.flavor_text_entries
      .filter(f => f.language.name === 'fr')
      .at(-1)
      ?.flavor_text
      .replace(/\f|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''

    const types = poke.types.map(t => TYPE_FR[t.type.name] ?? t.type.name).join(' / ')
    const height = (poke.height / 10).toFixed(1)
    const weight = (poke.weight / 10).toFixed(1)
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.id}.png`

    const CYAN   = ANSI_COLORS.cyan
    const BLUE   = ANSI_COLORS.blue
    const RESET  = '\u001b[0m'
    const SEP    = `${BLUE}${'─'.repeat(40)}${RESET}`

    const idStr = `N°${String(poke.id).padStart(4, '0')}`

    let output = `${CYAN}[ POKÉMON · ${frName.toUpperCase()} ]${RESET}\n`
    output += `${SEP}\n`
    output += `${BLUE}${idStr}${RESET}`
    if (genus) output += `  ${CYAN}${genus}${RESET}`
    output += `\n${BLUE}Type${RESET} : ${CYAN}${types}${RESET}\n`
    output += `${BLUE}Taille${RESET} : ${height} m   ${BLUE}Poids${RESET} : ${weight} kg\n`
    output += `${SEP}\n`

    for (const s of poke.stats) {
      const label = STAT_LABEL[s.stat.name] ?? s.stat.name.padEnd(6)
      const bar = statBar(s.base_stat)
      const val = String(s.base_stat).padStart(3)
      const color = s.base_stat >= 60 ? CYAN : BLUE
      output += `${BLUE}${label}${RESET} ${color}${bar}${RESET} ${color}${val}${RESET}\n`
    }

    if (flavor) {
      output += `${SEP}\n`
      const truncated = flavor.length > 200 ? flavor.slice(0, 200) + '...' : flavor
      output += `${CYAN}${truncated}${RESET}\n`
    }

    const ansiMessage = `\`\`\`ansi\n${output.trimEnd()}\n\`\`\``

    return [ansiMessage, artworkUrl]

  } catch {
    return {
      success: false,
      msg: `Une erreur s'est produite lors de la recherche du Pokémon "${query}".`
    }
  }
}
