import { freqHandler } from './handler'

export default {
  variants: ['freq'],
  helper: 'Fréquence, phonétique et formes d\'un mot. `.freq silence` · `.freq brise`',
  fn: freqHandler
}
