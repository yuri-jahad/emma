import { searchWordsHandler } from '@features/search-words/handler'

export default {
  variants: ['c', 'search', 'dico', 'dictionary'],
  helper: 'Trouve les mots correspondants à une syllabe ou à un motif regex.',
  config: {
    role: 'every',
    limit: {
      fallback: 20
    }
  },

  fn: searchWordsHandler
}
