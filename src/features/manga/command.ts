import { mangaHandler } from './handler'

export default {
  variants: ['manga', 'anime'],
  helper: 'Actualités manga/animé via AniList. `.manga` anime en cours · `.manga manga` manga récents · `.manga naruto` recherche',
  fn: mangaHandler
}
