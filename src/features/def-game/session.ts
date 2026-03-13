import type { TextChannel, DMChannel } from 'discord.js'

export type SendableChannel = TextChannel | DMChannel

interface BaseSession {
  starterId: string
  channel: SendableChannel
  hintTimer: ReturnType<typeof setTimeout> | null
  gameTimer: ReturnType<typeof setTimeout>
}

export interface DefGameSession extends BaseSession {
  type: 'def'
  displayWord: string
  normalizedWord: string
}

export interface SylGameSession extends BaseSession {
  type: 'syl'
  syllable: string
  solutionCount: number
}

export type GameSession = DefGameSession | SylGameSession

export const sessions = new Map<string, GameSession>()

export function clearSession(channelId: string): void {
  const session = sessions.get(channelId)
  if (!session) return
  if (session.hintTimer) clearTimeout(session.hintTimer)
  clearTimeout(session.gameTimer)
  sessions.delete(channelId)
}
