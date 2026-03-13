import { sylGameHandler } from './handler'

export default {
  variants: ['sg', 'sylgame'],
  helper: 'Lance un jeu de syllabes. Usage : ".sg <n>" (ta liste) ou ".sg <pseudo> <n>" (liste d\'un joueur).',
  fn: sylGameHandler
}
