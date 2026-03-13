import type {
  TmEvent, TmResponse, TmImage,
  PhqEvent, PhqResponse,
  HipHopEvent
} from './type'

// ─── Config ───────────────────────────────────────────────────────────────────

const TM_BASE  = 'https://app.ticketmaster.com/discovery/v2'
const TM_KEY   = process.env.TICKETMASTER_API_KEY ?? ''
const PHQ_KEY  = process.env.PREDICTHQ_API_TOKEN  ?? ''

const CACHE_TTL = 10 * 60 * 1000
const cache     = new Map<string, { events: HipHopEvent[]; expiresAt: number }>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate (isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function pickBestTmImage (images: TmImage[]): string {
  return [...images]
    .sort((a, b) => {
      const score = (r: string) => r === '16_9' ? 2 : r === '3_2' ? 1 : 0
      const diff = score(b.ratio) - score(a.ratio)
      return diff !== 0 ? diff : b.width - a.width
    })[0]?.url ?? ''
}

function dedup (events: HipHopEvent[]): HipHopEvent[] {
  const seen = new Set<string>()
  return events.filter(e => {
    // key = normalized name + date to catch duplicates across sources
    const key = `${e.name.toLowerCase().replace(/\s+/g, '')}|${e.rawDate}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortByDate (events: HipHopEvent[]): HipHopEvent[] {
  return [...events].sort((a, b) => a.rawDate.localeCompare(b.rawDate))
}

// ─── Ticketmaster ─────────────────────────────────────────────────────────────

function normalizeTm (e: TmEvent): HipHopEvent {
  const venue   = e._embedded?.venues?.[0]
  const primary = e.classifications?.find(c => c.primary) ?? e.classifications?.[0]
  const genre   = [primary?.genre?.name, primary?.subGenre?.name]
    .filter(Boolean).join(' · ')
  const artists = e._embedded?.attractions?.map(a => a.name) ?? []
  const price   = e.priceRanges?.[0]
  const rawDate = e.dates.start.localDate ?? ''

  return {
    id:       `tm_${e.id}`,
    source:   'ticketmaster',
    name:     e.name,
    date:     rawDate ? formatDate(rawDate) : 'Date inconnue',
    rawDate,
    time:     e.dates.start.localTime?.slice(0, 5) ?? '',
    venue:    venue?.name ?? '',
    city:     venue?.city?.name ?? '',
    country:  venue?.country?.name ?? '',
    genre,
    artists,
    imageUrl:  pickBestTmImage(e.images),
    ticketUrl: e.url ?? '',
    priceMin:  price?.min,
    priceMax:  price?.max,
    currency:  price?.currency,
    status:    e.dates.status.code,
    note:      e.pleaseNote ?? e.info
  }
}

/**
 * Search Ticketmaster — runs two requests in parallel:
 * 1) By Hip-Hop/Rap genre classification (broad, reliable)
 * 2) By user keyword (specific, catches named events)
 */
async function searchTicketmaster (userQuery: string): Promise<HipHopEvent[]> {
  if (!TM_KEY) return []

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const base: Record<string, string> = {
    apikey: TM_KEY,
    size:   '20',
    sort:   'date,asc',
    startDateTime: now,
    locale: '*'
  }

  const requests = [
    // Genre-based: all Hip-Hop/Rap events worldwide (most reliable)
    new URLSearchParams({ ...base, classificationName: 'Hip-Hop/Rap' }),
    // Keyword-based: covers "battle", "freestyle", "Bogota hip hop", etc.
    new URLSearchParams({ ...base, keyword: userQuery })
  ]

  // Add a city-targeted genre search if query looks like a location
  if (userQuery.split(' ').length <= 2) {
    requests.push(
      new URLSearchParams({ ...base, classificationName: 'Hip-Hop/Rap', keyword: userQuery })
    )
  }

  const settled = await Promise.allSettled(
    requests.map(p => fetch(`${TM_BASE}/events.json?${p}`).then(r => r.json() as Promise<TmResponse>))
  )

  const events: HipHopEvent[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const list = result.value._embedded?.events ?? []
      events.push(...list.map(normalizeTm))
    }
  }
  return events
}

// ─── PredictHQ ────────────────────────────────────────────────────────────────

const PHQ_COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada',
  US: 'États-Unis', GB: 'Royaume-Uni', CO: 'Colombie',
  MX: 'Mexique', BR: 'Brésil', DE: 'Allemagne', ES: 'Espagne',
  IT: 'Italie', NL: 'Pays-Bas', JP: 'Japon', SN: 'Sénégal',
  CI: "Côte d'Ivoire", MA: 'Maroc'
}

function normalizePhq (e: PhqEvent): HipHopEvent {
  const venue = e.entities.find(en => en.type === 'venue')
  const address = venue?.formatted_address ?? ''

  // Parse city from formatted_address: "Street, City, Country"
  const addrParts = address.split(',').map(s => s.trim())
  const city    = addrParts.length >= 2 ? addrParts[addrParts.length - 2] ?? '' : ''
  const country = PHQ_COUNTRY_NAMES[e.country] ?? e.country

  const rawDate = e.start.slice(0, 10)

  // Local time from start (stored as UTC — approximate)
  const startDt = new Date(e.start)
  const time = `${String(startDt.getUTCHours()).padStart(2, '0')}:${String(startDt.getUTCMinutes()).padStart(2, '0')}`

  const genre = e.labels
    .filter(l => !['music', 'concert', 'festival'].includes(l))
    .slice(0, 2)
    .join(', ')

  return {
    id:         `phq_${e.id}`,
    source:     'predicthq',
    name:       e.title,
    date:       formatDate(rawDate),
    rawDate,
    time:       time === '00:00' ? '' : time,
    venue:      venue?.name ?? '',
    city,
    country,
    genre:      genre || e.category,
    artists:    [],
    imageUrl:   '',   // PredictHQ has no images
    ticketUrl:  '',
    status:     e.state === 'active' ? 'onsale' : e.state,
    note:       e.description,
    attendance: e.phq_attendance
  }
}

async function searchPredictHQ (userQuery: string): Promise<HipHopEvent[]> {
  if (!PHQ_KEY) return []

  const today = new Date().toISOString().slice(0, 10)

  const params = new URLSearchParams({
    q:             userQuery,
    category:      'concerts,community,festivals',
    'active.gte':  today,
    sort:          'start',
    limit:         '20'
  })

  const res = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
    headers: { Authorization: `Bearer ${PHQ_KEY}` }
  })

  if (!res.ok) {
    console.warn(`[Events] PredictHQ ${res.status}`)
    return []
  }

  const data = await res.json() as PhqResponse
  return data.results.map(normalizePhq)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the keyword used for API queries from raw command args.
 * Always orients toward hip-hop if not already specified.
 */
export function buildKeyword (rawArgs: string[]): string {
  const userInput = rawArgs.join(' ').trim()
  if (!userInput) return 'hip hop battle'
  const lower = userInput.toLowerCase()
  const isHipHop = lower.includes('hip') || lower.includes('rap')
    || lower.includes('battle') || lower.includes('freestyle')
    || lower.includes('break') || lower.includes('danse')
  return isHipHop ? userInput : `${userInput} hip hop`
}

/**
 * Fetch events from all sources, merge, deduplicate, sort by date.
 */
export async function searchHipHopEvents (
  query: string,
  _maxResults = 40
): Promise<{ events: HipHopEvent[]; total: number }> {
  const cacheKey = query.toLowerCase().trim()
  const cached   = cache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return { events: cached.events, total: cached.events.length }
  }

  const [tmEvents, phqEvents] = await Promise.allSettled([
    searchTicketmaster(query),
    searchPredictHQ(query)
  ])

  const all: HipHopEvent[] = [
    ...(tmEvents.status  === 'fulfilled' ? tmEvents.value  : []),
    ...(phqEvents.status === 'fulfilled' ? phqEvents.value : [])
  ]

  const events = sortByDate(dedup(all))
  cache.set(cacheKey, { events, expiresAt: Date.now() + CACHE_TTL })

  console.log(`[Events] "${query}" → TM: ${tmEvents.status === 'fulfilled' ? tmEvents.value.length : 'err'} | PHQ: ${phqEvents.status === 'fulfilled' ? phqEvents.value.length : 'err'} | merged: ${events.length}`)

  return { events, total: events.length }
}
