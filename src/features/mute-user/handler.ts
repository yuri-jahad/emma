import type { CommandContext } from '@shared/command/type'

export async function muteHandler({
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
      msg: 'Syntaxe invalide. Utilisation requise : .mute <id>'
    }
  }

  if (targetId === message.author.id) {
    return {
      success: false,
      msg: 'Action impossible : Vous ne pouvez pas appliquer de restriction sur votre propre compte.'
    }
  }

  const targetUser = bot.users.getUser(targetId)

  if (!targetUser) {
    return {
      success: false,
      msg: `L'identifiant fourni (${targetId}) ne correspond à aucun utilisateur enregistré.`
    }
  }

  if (targetUser.role === 'owner') {
    return {
      success: false,
      msg: 'Action impossible : La suspension des droits du propriétaire est interdite par le système.'
    }
  }

  if (targetUser.muted) {
    return {
      success: true,
      msg: `L'utilisateur ${targetUser.username} fait déjà l'objet d'une suspension de droits.`
    }
  }

  await bot.users.setMuteState(targetId, true)

  return {
    success: true,
    msg: `Les droits d'interaction de l'utilisateur ${targetUser.username} ont été suspendus avec succès.`
  }
}
