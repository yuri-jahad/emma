import { myListSearchWordsHandler } from './handler'

export default {
  variants: ['ml', 'mylist'],
  helper:
    'Trouve les mots de sa liste personnelle correspondants à une syllabe ou à un motif regex.',
  fn: myListSearchWordsHandler
}
