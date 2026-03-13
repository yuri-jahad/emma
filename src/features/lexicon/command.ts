import { lexiconHandler } from './handler'

export default {
  variants: ['phon', 'son'],
  helper:
    'Recherche des mots par son phonétique. `.phon zo` · `.phon mEz 2` · `.phon twa 2 nom`',
  fn: lexiconHandler
}
