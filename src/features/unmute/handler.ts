import type { CommandContext } from '@shared/command/type'

export async function unmuteHandler ({
  args,
  bot,
  message,
  clientGuard
}: CommandContext) {
  const guard = clientGuard(bot, message.author.id, ['admin'])

  if (!guard.success) {
    return guard
  }

  const targetId = args[1]

  if (!targetId) {
    return {
      success: false,
      msg: 'Syntaxe invalide. Utilisation requise : .unmute <id>'
    }
  }

  const targetUser = bot.users.getUser(targetId)

  if (!targetUser) {
    return {
      success: false,
      msg: `L'identifiant fourni (${targetId}) ne correspond à aucun utilisateur enregistré.`
    }
  }

  if (!targetUser.muted) {
    return {
      success: true,
      msg: `L'utilisateur ${targetUser.username} ne fait actuellement l'objet d'aucune suspension de droits.`
    }
  }

  await bot.users.setMuteState(targetId, false)

  return {
    success: true,
    msg: `Les droits d'interaction de l'utilisateur ${targetUser.username} ont été rétablis avec succès.`
  }
}
