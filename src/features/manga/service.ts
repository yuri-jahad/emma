export type MediaType = 'ANIME' | 'MANGA'

export interface AniListMedia {
  id: number
  type: MediaType
  title: { romaji: string; english: string | null }
  coverImage: { extraLarge: string; color: string | null }
  description: string | null
  genres: string[]
  averageScore: number | null
  status: string
  episodes: number | null
  chapters: number | null
  format: string | null
  siteUrl: string
  nextAiringEpisode: { episode: number; timeUntilAiring: number } | null
}

interface AniListResponse {
  data: { Page: { media: AniListMedia[] } }
  errors?: { message: string }[]
}

const CACHE_TTL = 15 * 60 * 1000
const cache = new Map<string, { items: AniListMedia[]; expiresAt: number }>()

const QUERY = `
query ($type: MediaType, $search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(
      type: $type
      search: $search
      status: RELEASING
      sort: [UPDATED_AT_DESC]
      isAdult: false
    ) {
      id type
      title { romaji english }
      coverImage { extraLarge color }
      description(asHtml: false)
      genres averageScore status episodes chapters format siteUrl
      nextAiringEpisode { episode timeUntilAiring }
    }
  }
}`

async function query (variables: Record<string, unknown>): Promise<AniListMedia[]> {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables }),
    signal: AbortSignal.timeout(10_000)
  })
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`)
  const data = await res.json() as AniListResponse
  if (data.errors?.length) throw new Error(data.errors[0]!.message)
  return data.data.Page.media
}

export async function fetchLatest (type: MediaType, search?: string): Promise<AniListMedia[]> {
  const key = `${type}_${search ?? 'all'}`
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached.items
  const items = await query({ type, search: search || undefined, perPage: 25 })
  cache.set(key, { items, expiresAt: Date.now() + CACHE_TTL })
  return items
}

export function cleanDesc (raw: string | null, max = 280): string {
  if (!raw) return '*Aucune description disponible.*'
  const clean = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

export function hexColor (color: string | null): number {
  return color ? parseInt(color.replace('#', ''), 16) : 0x5865F2
}

export function formatCountdown (seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d > 0) return `dans ${d}j ${h}h`
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `dans ${h}h ${m}min` : `dans ${m}min`
}
