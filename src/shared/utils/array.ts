import safeRegexTest from 'safe-regex-test'
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }
  return shuffled
}

export const searchWords = (
  searchValue: string,
  array: string[],
  limit: number
): { results: string[]; total: number } => {
  try {
    const regex = new RegExp(searchValue, 'i')
    const tester = safeRegexTest(regex)
    const allResults: string[] = []
    const shuffledArray = shuffle(array)

    for (const item of shuffledArray) {
      if (tester(item)) {
        allResults.push(item.toUpperCase())
      }
    }

    return {
      results: allResults.slice(0, limit),
      total: allResults.length
    }
  } catch (error) {
    throw new Error('Invalid regular expression pattern')
  }
}
