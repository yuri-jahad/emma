export const ANSI_MSG_LIMIT = 974

export function ansiLen(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, '').length
}

export function fitsInMessage(str: string): boolean {
  return str.length <= ANSI_MSG_LIMIT
}

export const ANSI_COLORS = {
  red: '\u001b[31m\u001b[1m',
  green: '\u001b[32m\u001b[1m',
  yellow: '\u001b[33m\u001b[1m',
  blue: '\u001b[34m\u001b[1m',
  magenta: '\u001b[35m\u001b[1m',
  cyan: '\u001b[36m\u001b[1m',
  white: '\u001b[37m\u001b[1m'
} as const

export type MessageColor = keyof typeof ANSI_COLORS

export const sleep = (time: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, time))

export const reformatTextService = (
  firstCmd: string,
  result: string | { success: boolean; msg: string }
): string[] => {
  const actualMsg =
    typeof result === 'object' && result !== null ? result.msg : String(result)
  if (!actualMsg || actualMsg.trim() === '') {
    return []
  }

  const cmdTitle = `${firstCmd}\n`
  const CHUNK_SIZE = 962
  const messages: string[] = []

  let finalResult: string
  let color: MessageColor = 'cyan'

  if (typeof result === 'object' && result !== null) {
    finalResult = result.msg
    color = result.success ? 'cyan' : 'red'
  } else {
    finalResult = String(result)
    color = 'cyan'
  }

  const content = cmdTitle + finalResult

  if (content.length <= CHUNK_SIZE) {
    messages.push(COLORS_MESSAGE.format(finalResult, color, cmdTitle))
    return messages
  }

  const blocks = content.split('\n\n')
  let currentChunk = ''

  for (const block of blocks) {
    if (currentChunk.length + block.length + 2 > CHUNK_SIZE) {
      if (currentChunk) {
        const isFirstChunk = messages.length === 0
        const cmd = isFirstChunk ? cmdTitle : ''
        const textToFormat = isFirstChunk
          ? currentChunk.replace(cmdTitle, '')
          : currentChunk

        messages.push(COLORS_MESSAGE.format(textToFormat.trim(), color, cmd))
        currentChunk = ''
      }

      if (block.length > CHUNK_SIZE) {
        let remainingBlock = block

        while (remainingBlock.length > CHUNK_SIZE) {
          let splitIndex = remainingBlock.lastIndexOf(' ', CHUNK_SIZE)
          if (splitIndex === -1) splitIndex = CHUNK_SIZE

          const textToFormat = remainingBlock.slice(0, splitIndex)
          const cmd = messages.length === 0 ? cmdTitle : ''
          messages.push(COLORS_MESSAGE.format(textToFormat.trim(), color, cmd))

          remainingBlock = remainingBlock.slice(splitIndex).trim()
        }
        currentChunk = remainingBlock
      } else {
        currentChunk = block
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + block
    }
  }

  if (currentChunk) {
    const isFirstChunk = messages.length === 0
    const cmd = isFirstChunk ? cmdTitle : ''
    const textToFormat = isFirstChunk
      ? currentChunk.replace(cmdTitle, '')
      : currentChunk

    messages.push(COLORS_MESSAGE.format(textToFormat.trim(), color, cmd))
  }

  return messages
}

export const COLORS_MESSAGE = {
  colors: ANSI_COLORS,
  format (text: string, colorKey: MessageColor, cmd: string = ''): string {
    const colorCode = ANSI_COLORS[colorKey]
    return `${cmd}\`\`\`ansi\n${colorCode}${text}\u001b[0m\n\`\`\``
  }
} as const

export function cleanAccents(text: string): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') 
}
