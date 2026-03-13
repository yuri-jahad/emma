import * as fs from 'fs'
import * as path from 'path'
import csv from 'csv-parser'

export type LexiconWord = {
  ortho: string
  phon: string
  lemme: string
  cgram: string
  nbsyll: number
  nbLettres: number
  freq: number
  isLem: boolean
}

export class LexiconService {
  private static instance: LexiconService | null = null
  private dictionary: LexiconWord[] = []
  private isLoaded = false
  private phonIndex = new Map<string, LexiconWord[]>()

  private constructor () {}

  static getInstance (): LexiconService {
    if (!LexiconService.instance) {
      LexiconService.instance = new LexiconService()
    }
    return LexiconService.instance
  }

  async loadDictionary (): Promise<void> {
    if (this.isLoaded) return

    const filePath = path.join(import.meta.dir, '../../data/lexicon.tsv')

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: '\t' }))
        .on('data', row => {
          const ortho = row.ortho?.trim()
          const phon = (row.Lexique4__Phono || row.phon)?.trim()
          const lemme = (row.Lexique4__Lemme || row.lemme)?.trim()
          const cgram = (row.Lexique4__Cgram || row.cgram)?.trim()
          const nbsyll = parseInt(row.Lexique4__SyllNb || row.nbsyll, 10) || 0
          const nbLettres = parseInt(row.Lexique4__NbLettres || row.nbLettres, 10) || 0
          const freq = parseFloat(row.Lexique4__FreqOrtho || row.freq) || 0
          const isLem = (row.Lexique4__IsLem || '0') === '1'

          if (ortho && phon) {
            this.dictionary.push({ ortho, phon, lemme: lemme ?? ortho, cgram: cgram ?? '', nbsyll, nbLettres, freq, isLem })
          }
        })
        .on('end', () => {
          this.buildIndex()
          this.isLoaded = true
          console.log(`[LexiconService] ${this.dictionary.length} entrées chargées.`)
          resolve()
        })
        .on('error', err => {
          console.error('[LexiconService] Erreur de chargement :', err)
          reject(err)
        })
    })
  }

  private buildIndex (): void {
    for (const word of this.dictionary) {
      const existing = this.phonIndex.get(word.phon)
      if (existing) {
        existing.push(word)
      } else {
        this.phonIndex.set(word.phon, [word])
      }
    }
  }

  get loaded (): boolean {
    return this.isLoaded
  }

  searchBySound (targetPhon: string, nbsyll?: number, cgram?: string): LexiconWord[] {
    if (!this.isLoaded) return []
    const target = targetPhon.toLowerCase()
    return this.dictionary.filter(w => {
      if (!w.phon.toLowerCase().includes(target)) return false
      if (nbsyll !== undefined && w.nbsyll !== nbsyll) return false
      if (cgram && !w.cgram.toUpperCase().startsWith(cgram.toUpperCase())) return false
      return true
    })
  }

  getWord (ortho: string): LexiconWord | undefined {
    if (!this.isLoaded) return undefined
    return this.dictionary.find(w => w.ortho.toLowerCase() === ortho.toLowerCase() && w.isLem)
      ?? this.dictionary.find(w => w.ortho.toLowerCase() === ortho.toLowerCase())
  }

  getHomophones (ortho: string): LexiconWord[] {
    if (!this.isLoaded) return []
    const source = this.getWord(ortho)
    if (!source) return []
    const candidates = this.phonIndex.get(source.phon) ?? []
    return candidates.filter(w => w.ortho.toLowerCase() !== ortho.toLowerCase())
  }

  getForms (lemme: string): LexiconWord[] {
    if (!this.isLoaded) return []
    const lower = lemme.toLowerCase()
    return this.dictionary.filter(w => w.lemme.toLowerCase() === lower)
  }

  randomWords (opts: {
    cgrams?: string[]
    minFreq?: number
    maxFreq?: number
    minSyll?: number
    maxSyll?: number
  }, count: number): LexiconWord[] {
    if (!this.isLoaded) return []
    const pool = this.dictionary.filter(w => {
      if (!w.isLem) return false
      if (opts.cgrams && !opts.cgrams.some(c => w.cgram.startsWith(c))) return false
      if (opts.minFreq !== undefined && w.freq < opts.minFreq) return false
      if (opts.maxFreq !== undefined && w.freq > opts.maxFreq) return false
      if (opts.minSyll !== undefined && w.nbsyll < opts.minSyll) return false
      if (opts.maxSyll !== undefined && w.nbsyll > opts.maxSyll) return false
      return true
    })
    // Fisher-Yates sample
    const result: LexiconWord[] = []
    const arr = [...pool]
    for (let i = 0; i < Math.min(count, arr.length); i++) {
      const j = i + Math.floor(Math.random() * (arr.length - i))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
      result.push(arr[i]!)
    }
    return result
  }

  getRimeSuffix (ortho: string): string | null {
    const source = this.getWord(ortho)
    if (!source) return null
    const phon    = source.phon
    const vowels  = new Set(['a', 'e', 'E', 'i', 'o', 'u', 'y', '§', '5', '1', '2', '9', '@', 'O', 'U', 'A', 'I'])
    let start = phon.length - 1
    for (let i = phon.length - 1; i >= 0; i--) {
      if (vowels.has(phon[i]!)) { start = i; break }
    }
    return phon.slice(start)
  }

  getRhymes (ortho: string, nbsyll?: number): LexiconWord[] {
    if (!this.isLoaded) return []

    const source = this.getWord(ortho)
    if (!source) return []

    const phon = source.phon
    const vowels = new Set(['a', 'e', 'E', 'i', 'o', 'u', 'y', '§', '5', '1', '2', '9', '@', 'O', 'U', 'A', 'I'])

    let suffixStart = phon.length - 1
    for (let i = phon.length - 1; i >= 0; i--) {
      if (vowels.has(phon[i]!)) {
        suffixStart = i
        break
      }
    }
    const rimeSuffix = phon.slice(suffixStart)
    if (!rimeSuffix || rimeSuffix.length < 1) return []

    return this.dictionary.filter(w => {
      if (w.ortho.toLowerCase() === ortho.toLowerCase()) return false
      if (!w.phon.endsWith(rimeSuffix)) return false
      if (nbsyll !== undefined && w.nbsyll !== nbsyll) return false
      return true
    })
  }
}

export const lexiconService = LexiconService.getInstance()
