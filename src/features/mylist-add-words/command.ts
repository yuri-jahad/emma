import { addWordsHandler } from './handler'

export default  {
  variants: ['mla', 'add', 'ajouter'],
  helper: 'Ajoute un ou plusieurs mots à votre liste personnelle. Exemple : .mla maison chat',
  fn: addWordsHandler
}

