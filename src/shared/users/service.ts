import { DataService, USERS_DATA_PATH } from '@data/service'
import type { User, USER_ROLE } from '@shared/user/type'

export class UsersService {
  private static instance: UsersService | null = null
  private readonly userCache: Map<string, User> = new Map()
  private readonly dataManager = DataService.getInstance()

  private constructor () {}

  static getInstance (): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService()
    }
    return UsersService.instance
  }

  async load (): Promise<void> {
    const rawData = await this.dataManager.loadData(USERS_DATA_PATH)

    if (!Array.isArray(rawData)) {
      await this.dataManager.saveData(USERS_DATA_PATH, [])
      return
    }

    this.userCache.clear()
    for (const userData of rawData) {
      if (!userData.list) userData.list = []
      this.userCache.set(userData.id, userData)
    }
  }

  async reload (): Promise<void> {
    await this.load()
  }

  get users (): User[] {
    return Array.from(this.userCache.values())
  }

  get count (): number {
    return this.userCache.size
  }

  getUser (userId: string): User | undefined {
    return this.userCache.get(userId)
  }

  getList(userid: string) {
    return this.userCache.get(userid)?.list
  }

  getIdByName (targetUsername: string): string[] {
    const normalizedUsername = targetUsername.toLowerCase()
    return this.users
      .filter(user => user.username.toLowerCase() === normalizedUsername)
      .map(user => user.id)
  }

  async addUser (newUser: User): Promise<void> {
    if (this.userCache.has(newUser.id)) return

    if (!newUser.list) newUser.list = []

    this.userCache.set(newUser.id, newUser)
    await this.save()
  }

  async setMuteState (
    targetUserId: string,
    shouldMute: boolean
  ): Promise<boolean> {
    const targetUser = this.userCache.get(targetUserId)
    if (!targetUser) return false

    if (targetUser.muted === shouldMute) return true

    targetUser.muted = shouldMute
    await this.save()
    return true
  }

  async addWords (
    userId: string,
    wordsToAdd: string[]
  ): Promise<{ addedWords: string[]; existingWords: string[] }> {
    const targetUser = this.getUser(userId)
    if (!targetUser) return { addedWords: [], existingWords: [] }
    if (!targetUser.list) targetUser.list = []

    const successfullyAddedWords: string[] = []
    const alreadyExistingWords: string[] = []

    for (const word of wordsToAdd) {
      if (targetUser.list.includes(word)) {
        alreadyExistingWords.push(word)
      } else {
        targetUser.list.push(word)
        successfullyAddedWords.push(word)
      }
    }

    if (successfullyAddedWords.length > 0) {
      await this.save()
    }

    return {
      addedWords: successfullyAddedWords,
      existingWords: alreadyExistingWords
    }
  }

  async deleteWords (
    userId: string,
    wordsToRemove: string[]
  ): Promise<string[]> {
    const targetUser = this.getUser(userId)
    if (!targetUser || !targetUser.list || targetUser.list.length === 0)
      return []

    const previousListLength = targetUser.list.length

    targetUser.list = targetUser.list.filter(
      existingWord => !wordsToRemove.includes(existingWord)
    )
    const successfullyDeletedWords = wordsToRemove.filter(
      wordToRemove => !targetUser.list.includes(wordToRemove)
    )

    if (targetUser.list.length !== previousListLength) {
      await this.save()
    }

    return successfullyDeletedWords
  }

  private async save (): Promise<void> {
    await this.dataManager.saveData(USERS_DATA_PATH, this.users)
  }
}
