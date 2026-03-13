export interface NewsItem {
  title: string
  link: string
  description: string
  pubDate: string
  imageUrl: string
  source: string
}

const FEEDS: { url: string; source: string }[] = [
  { url: 'https://www.hiphop.fr/feed/',        source: 'HipHop.fr' },
  { url: 'https://www.rap2k.com/feed/',         source: 'Rap2K' },
  { url: 'https://www.mouv.fr/rss/fresh-news',  source: 'Mouv' },
]

const CACHE_TTL = 15 * 60 * 1000
let cached: { items: NewsItem[]; expiresAt: number } | null = null

function extractTag (xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i'))
  return m ? m[1]!.trim() : ''
}

function extractAttr (xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, 'i'))
  return m ? m[1]!.trim() : ''
}

function parseRSS (xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  const matches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)

  for (const match of matches) {
    const block = match[1]!
    const title  = extractTag(block, 'title').replace(/&amp;/g, '&').replace(/&#\d+;/g, '')
    const link   = extractTag(block, 'link') || extractTag(block, 'guid')
    const desc   = extractTag(block, 'description')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')
    const imageUrl = extractAttr(block, 'enclosure', 'url')
      || extractAttr(block, 'media:content', 'url')
      || extractAttr(block, 'media:thumbnail', 'url')
      || (block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '')

    if (title && link) {
      items.push({ title, link, description: desc, pubDate, imageUrl, source })
    }
  }
  return items
}

function parseDate (str: string): number {
  if (!str) return 0
  const d = new Date(str)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export async function fetchNews (): Promise<NewsItem[]> {
  if (cached && Date.now() < cached.expiresAt) return cached.items

  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PhantaminumBot/1.0)' },
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`)
      const xml = await res.text()
      return parseRSS(xml, source)
    })
  )

  const all: NewsItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
    else console.warn('[ActuService]', r.reason)
  }

  const sorted = all
    .sort((a, b) => parseDate(b.pubDate) - parseDate(a.pubDate))
    .slice(0, 30)

  cached = { items: sorted, expiresAt: Date.now() + CACHE_TTL }
  return sorted
}
