import { homoHandler } from './handler'

export default {
  variants: ['homo', 'homophones'],
  helper: 'Trouve les homophones d\'un mot (même son, orthographe différente). `.homo ver` · `.homo san`',
  fn: homoHandler
}
