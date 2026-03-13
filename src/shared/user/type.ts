export type USER_ROLE = 'admin' | 'modo' | 'staff' | 'user' | 'owner'

export interface DefGameStats {
  wins: number
  played: number
}

export interface User {
  id: string
  username: string
  role: USER_ROLE
  avatar: string | null
  muted: boolean
  list: string[]
  defGame?: DefGameStats
}
