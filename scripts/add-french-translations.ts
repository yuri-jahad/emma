import { join } from 'path'

const CORAN_PATH = join(import.meta.dir, '../src/data/coran.json')
const API_BASE = 'https://api.alquran.cloud/v1/surah'
const EDITION = 'fr.hamidullah'
const DELAY_MS = 300

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchFrenchVerses(surahNb: number): Promise<string[]> {
  const res = await fetch(`${API_BASE}/${surahNb}/${EDITION}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} for surah ${surahNb}`)
  const json = await res.json() as any
  return (json.data.ayahs as any[]).map((a: any) => a.text as string)
}

const file = Bun.file(CORAN_PATH)
const surahs: any[] = await file.json()

console.log(`[Script] ${surahs.length} sourates à traiter...`)

for (const surah of surahs) {
  if (surah.contentFr && surah.contentFr.length > 0) {
    console.log(`[Skip] Sourate ${surah.surahNb} déjà traduite`)
    continue
  }

  try {
    const verses = await fetchFrenchVerses(surah.surahNb)
    surah.contentFr = verses
    console.log(`[OK] Sourate ${surah.surahNb} — ${verses.length} versets`)
  } catch (err) {
    console.error(`[ERR] Sourate ${surah.surahNb}:`, err)
    surah.contentFr = []
  }

  await sleep(DELAY_MS)
}

await Bun.write(CORAN_PATH, JSON.stringify(surahs, null, 2))
console.log('[Done] coran.json mis à jour avec les traductions françaises.')
