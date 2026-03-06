import { helpHandler } from '@features/help/handler'

export default {
  variants: ['help', 'h', 'aide', 'menu'],
  helper:
    'Affiche de maniere dynamique la liste de toutes les commandes disponibles sur le bot.',
  fn: helpHandler
}
