import type { PhantaminumBot } from '@core/bot/phantaminum-bot'
import type { USER_ROLE } from './type'

type GuardResult = {
  success: boolean
  msg?: string
}

export const clientGuard = (
  bot: PhantaminumBot,
  userId: string,
  allowedRoles: USER_ROLE[]
): GuardResult => {
  const user = bot.users.getUser(userId)

  if (!user || !user.role) {
    return {
      success: false,
      msg: "Autorisation refusée : Votre profil n'est pas enregistré dans la base de données du bot."
    }
  }

  const { role } = user

  if (role === 'owner') {
    return { success: true }
  }

  if (!allowedRoles.includes(role)) {
    const rolesText = allowedRoles.join(', ')
    return {
      success: false,
      msg: `Autorisation refusée : Le niveau de privilège de votre compte (${role}) est insuffisant. Rôles requis : [${rolesText}].`
    }
  }

  return { success: true }
}
