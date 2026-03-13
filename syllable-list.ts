import { words } from './src/core/dictionary/cache'
import { shuffle } from './src/shared/utils/array';

export const processSyllables = (args: string[]) => {
  const mode = args[0]
  if (mode !== 'pick' && mode !== 'omit') return new Map<string, Set<string>>()

  const val1 = +args[1]
  const val2 = +args[2]
  if (!Number.isFinite(val1)) return new Map<string, Set<string>>()

  const hasVal2 = Number.isFinite(val2)
  const isPick = mode === 'pick'
  const { occurrences, words: wordList } = words.data

  const targetSets = Object.create(null)
  const keys = Object.keys(occurrences)
  const keysLen = keys.length
  let hasTargets = false

  for (let i = 0; i < keysLen; i++) {
    const k = keys[i]
    const len = k.length
    if (len === 2 || len === 3) {
      const occ = occurrences[k]
      const match = hasVal2 ? (occ >= val1 && occ <= val2) : (occ === val1)

      if (isPick ? match : !match) {
        targetSets[k] = new Set()
        hasTargets = true
      }
    }
  }

  if (!hasTargets) return new Map<string, Set<string>>()

  const wlLen = wordList.length

  for (let j = 0; j < wlLen; j++) {
    const w = wordList[j]
    const wLen = w.length
    const limit = wLen - 1

    for (let i = 0; i < limit; i++) {
      const set2 = targetSets[w.substring(i, i + 2)]
      if (set2 !== undefined) set2.add(w)

      const i3 = i + 3
      if (i3 <= wLen) {
        const set3 = targetSets[w.substring(i, i3)]
        if (set3 !== undefined) set3.add(w)
      }
    }
  }

  const finalMap = new Map<string, Set<string>>()
  const targetKeys = Object.keys(targetSets)
  const tKeysLen = targetKeys.length

  for (let i = 0; i < tKeysLen; i++) {
    const k = targetKeys[i]
    const set = targetSets[k]
    if (set.size > 0) {
      finalMap.set(k, set)
    }
  }

  return finalMap
}

const start = performance.now()
const result = processSyllables(["pick", "1", "2"])
const end = performance.now()

console.log(shuffle([...result])[0])
console.log(`${(end - start).toFixed(3)} ms`)
