export function getDefaultAvatar(gender?: string | null): string {
  const normalizedGender = gender?.toUpperCase()
  if (normalizedGender === 'FEMALE') return '/avatars/default-female.png'
  if (normalizedGender === 'MALE') return '/avatars/default-male.png'
  return '/avatars/default-neutral.png'
}

export function getUserAvatar(user: { avatar?: string | null; gender?: string | null; role?: string } | null): string {
  if (!user) return '/avatars/default-neutral.png'
  if (user.avatar) return user.avatar
  return getDefaultAvatar(user.gender)
}
