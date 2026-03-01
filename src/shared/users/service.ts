import { DataService, USERS_DATA_PATH } from '@data/service'
import type { User, USER_ROLE } from '@shared/user/type'

export class UsersService {
  private static instance: UsersService | null = null
  private _users: Map<string, User> = new Map()
  private readonly dataManager = DataService.getInstance()

  private constructor() {}

  static getInstance(): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService()
    }
    return UsersService.instance
  }

  async load(): Promise<void> {
    const raw = await this.dataManager.loadData(USERS_DATA_PATH)

    if (!raw || !Array.isArray(raw)) {
      await this.dataManager.saveData(USERS_DATA_PATH, [])
      return
    }

    this._users.clear()
    for (const user of raw) {
      this._users.set(user.id, user)
    }
  }

  async reload(): Promise<void> {
    await this.load()
  }

  get users(): User[] {
    return Array.from(this._users.values())
  }

  async addUser(user: User): Promise<void> {
    if (this._users.has(user.id)) {
      return
    }

    this._users.set(user.id, user)
    await this.save()
  }

  async setMuteState(targetId: string, isMuted: boolean): Promise<boolean> {
    const user = this._users.get(targetId)
    if (!user) return false

    if (user.muted === isMuted) return true

    user.muted = isMuted
    await this.save()
    return true
  }

  getUser(id: string): User | undefined {
    return this._users.get(id)
  }

  getIdByName(name: string): string[] {
    const ids: string[] = []
    for (const user of this._users.values()) {
      if (user.username.toLowerCase() === name.toLowerCase()) {
        ids.push(user.id)
      }
    }
    return ids
  }

  get count(): number {
    return this._users.size
  }

  private async save(): Promise<void> {
    await this.dataManager.saveData(USERS_DATA_PATH, this.users)
  }
}
