import { surahHandler } from '@features/get-surah/handler'

export default {
  variants: ['surah', 'sur'],
  helper: "Affiche le contenu des versets d'une sourate.",
  fn: surahHandler
}
