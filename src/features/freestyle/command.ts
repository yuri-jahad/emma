import { freestyleHandler } from './handler'

export default {
  variants: ['freestyle', 'flow'],
  helper: 'Génère des mots rares pour s\'exercer. `.freestyle` · `.freestyle dark` · `.freestyle lyric 8`  (thèmes: battle · dark · street · lyric · rare)',
  fn: freestyleHandler
}
