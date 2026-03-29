import { synonymeHandler } from '@features/synonyme/handler'

export default {
  variants: ['syn', 'synonyme', 'synonymes'],
  helper: "Affiche les synonymes et antonymes d'un mot. `.syn beau`",
  fn: synonymeHandler
}
