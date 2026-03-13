// ─── Ticketmaster ─────────────────────────────────────────────────────────────

export interface TmImage {
  ratio: string
  url: string
  width: number
  height: number
}

export interface TmVenue {
  name: string
  city?: { name: string }
  country?: { name: string; countryCode: string }
  state?: { name: string }
  address?: { line1: string }
}

export interface TmClassification {
  primary?: boolean
  segment?: { name: string }
  genre?: { name: string }
  subGenre?: { name: string }
}

export interface TmPriceRange {
  type: string
  currency: string
  min: number
  max: number
}

export interface TmEvent {
  id: string
  name: string
  url: string
  images: TmImage[]
  dates: {
    start: { localDate?: string; localTime?: string; dateTime?: string }
    status: { code: string }
  }
  classifications?: TmClassification[]
  priceRanges?: TmPriceRange[]
  pleaseNote?: string
  info?: string
  _embedded?: {
    venues?: TmVenue[]
    attractions?: { name: string }[]
  }
}

export interface TmResponse {
  _embedded?: { events: TmEvent[] }
  page: { size: number; totalElements: number; totalPages: number; number: number }
}

// ─── PredictHQ ────────────────────────────────────────────────────────────────

export interface PhqEntity {
  entity_id: string
  name: string
  type: 'venue' | 'organizer' | 'person' | string
  formatted_address?: string
}

export interface PhqEvent {
  id: string
  title: string
  category: string
  start: string           // ISO datetime UTC
  end?: string
  timezone?: string
  country: string         // ISO-3166 code e.g. "CO"
  location: [number, number] // [lon, lat]
  place_hierarchies: string[][]
  entities: PhqEntity[]
  labels: string[]
  state: string
  phq_attendance?: number
  description?: string
}

export interface PhqResponse {
  count: number
  results: PhqEvent[]
  next?: string
}

// ─── Normalized ───────────────────────────────────────────────────────────────

export interface HipHopEvent {
  id: string
  source: 'ticketmaster' | 'predicthq'
  name: string
  date: string            // formatted for display
  rawDate: string         // YYYY-MM-DD for sorting
  time: string            // HH:mm or ''
  venue: string
  city: string
  country: string
  genre: string
  artists: string[]
  imageUrl: string        // '' if none
  ticketUrl: string       // '' if none
  priceMin?: number
  priceMax?: number
  currency?: string
  status: string
  note?: string
  attendance?: number
}
