import { defGameHandler } from './handler'

export default {
  variants: ['dg', 'defgame'],
  helper: 'Lance un jeu de définitions. Usage : ".dg" (ta liste) ou ".dg <pseudo>" (liste d\'un joueur).',
  fn: defGameHandler
}
