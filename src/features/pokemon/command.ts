import { pokemonHandler } from './handler'

export default {
  variants: ['pokemon', 'poke'],
  helper: 'Affiche les infos d\'un Pokémon. Usage : ".pokemon pikachu" ou ".pokemon 25"',
  fn: pokemonHandler
}
