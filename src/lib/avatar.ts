export function getDefaultAvatar(gender?: string | null): string {
  if (gender === 'FEMALE') return '/avatars/default-female.png'
  if (gender === 'MALE') return '/avatars/default-male.png'
  return '/avatars/default-neutral.png'
}

export function getUserAvatar(user: { avatar?: string | null; gender?: string | null; role?: string } | null): string {
  if (!user) return '/avatars/default-neutral.png'
  if (user.avatar) return user.avatar
  return getDefaultAvatar(user.gender)
}
