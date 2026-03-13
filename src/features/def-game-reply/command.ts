import { defGameReplyHandler } from './handler'

export default {
  variants: ['rep'],
  helper: 'Répond à une partie de jeu de définitions en cours. Usage : ".rep <mot>"',
  fn: defGameReplyHandler
}
