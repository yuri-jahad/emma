import type { Surah, QuranStats } from '@features/get-surah/type'
import { join } from 'path'

export class QuranService {
  private surahs: Surah[] = []
  private quranPATH = join(import.meta.dir, '../../data/coran.json')
  private static instance: QuranService | null = null

  static getInstance (): QuranService {
    if (!QuranService.instance) {
      QuranService.instance = new QuranService()
    }
    return QuranService.instance
  }

  async initializeCoran (): Promise<void> {
    if (this.surahs.length > 0) return

    try {
      const file = Bun.file(this.quranPATH)
      this.surahs = await file.json()
      console.log(`[QuranService] ${this.surahs.length} sourates chargées.`)
    } catch (error) {
      console.error(
        "[QuranService] Erreur critique : le coran n'a pas été chargé.",
        error
      )
    }
  }

  getSurah (msg: string): Surah | undefined {
    const msgNb = +msg
    if (Number.isFinite(msgNb)) {
      return this.surahs.find(surah => surah.surahNb === msgNb)
    } else {
      return this.surahs.find(surah => surah.name.toLowerCase().includes(msg))
    }
  }

  quranInfos (): QuranStats | undefined {
    const firstSurah = this.surahs[0]

    if (!firstSurah) return undefined

    const stats = this.surahs.reduce(
      (acc, surah) => {
        const verseCount = surah.content.length

        const wordCount = surah.content.reduce(
          (sum, verse) => sum + Math.max(0, verse.split(' ').length - 1),
          0
        )

        acc.totalVerses += verseCount
        acc.totalWords += wordCount

        if (verseCount > acc.longestSurah.verseCount) {
          acc.longestSurah = { name: surah.transcription, verseCount }
        }

        if (verseCount < acc.shortestSurah.verseCount) {
          acc.shortestSurah = { name: surah.transcription, verseCount }
        }

        return acc
      },
      {
        totalVerses: 0,
        totalWords: 0,
        longestSurah: {
          name: firstSurah.transcription,
          verseCount: firstSurah.content.length
        },
        shortestSurah: {
          name: firstSurah.transcription,
          verseCount: firstSurah.content.length
        }
      }
    )

    return {
      totalSurahs: this.surahs.length,
      ...stats
    }
  }
}
