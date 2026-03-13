import { statsHandler } from './handler'

export default {
  variants: ['stats', 'profil'],
  helper: 'Affiche le profil d\'un utilisateur (liste, jeux, stats). `.stats` · `.stats @user`',
  fn: statsHandler
}
