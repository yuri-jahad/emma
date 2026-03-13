import { versHandler } from './handler'

export default {
  variants: ['vers', 'analyse'],
  helper: 'Analyse phonétique et syllabique d\'un vers complet. `.vers j\'arrive en silence comme une brise de vent`',
  fn: versHandler
}
