export interface Surah {
  name: string
  transcription: string
  translation: string
  verseCount: string
  link: string
  content: string[]
  contentFr: string[]
  surahNb: number
}
export interface QuranStats {
    totalSurahs: number
    totalVerses: number
    totalWords: number
    longestSurah: { name: string; verseCount: number }
    shortestSurah: { name: string; verseCount: number }
  }
