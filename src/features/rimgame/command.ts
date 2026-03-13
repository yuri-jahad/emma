import { rimgameHandler } from './handler'

export default {
  variants: ['rimgame', 'rg'],
  helper: 'Lance un jeu de rimes en temps réel dans le canal (45s). `.rimgame`',
  fn: rimgameHandler
}
