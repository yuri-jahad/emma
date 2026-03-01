import { unmuteHandler } from '@features/unmute/handler'

export default {
  variants: ['unmute'],
  helper: "Rétablit les droits d'interaction d'un utilisateur",
  fn: unmuteHandler
}
