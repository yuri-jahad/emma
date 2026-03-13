import { rimeHandler } from './handler'

export default {
  variants: ['rime', 'rimes'],
  helper: 'Trouve des rimes phonétiques pour un mot. `.rime maison` · `.rime soleil 2` · `.rime ciel 1 nom`',
  fn: rimeHandler
}
