import { eventsHandler } from './handler'

export default {
  variants: ['battle', 'events', 'ev'],
  helper: 'Recherche des événements hip-hop (battles, concerts…) par ville ou tag. Exemples : `.battle` · `.battle bogota` · `.battle paris freestyle`',
  fn: eventsHandler
}
