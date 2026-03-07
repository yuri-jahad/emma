import { deleteWordsHandler } from './handler'

export default {
  variants: ['mld', 'del', 'delete', 'remove'],
  helper:
    'Supprime un ou plusieurs mots de votre liste personnelle. Exemple : .mld maison chat',
  fn: deleteWordsHandler
}
