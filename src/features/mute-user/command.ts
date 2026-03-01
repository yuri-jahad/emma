import { muteHandler } from '@features/mute-user/handler'

export default {
  variants: ['mute'],
  helper: 'Rend muet un utilisateur',
  fn: muteHandler
}
