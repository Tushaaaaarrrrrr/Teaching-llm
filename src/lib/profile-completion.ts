type ProfileCompletionFields = {
  firstName?: string | null
  lastName?: string | null
  mobileNumber?: string | null
  gender?: string | null
  age?: number | null
  state?: string | null
}

export function hasCompleteProfileFields(user: ProfileCompletionFields): boolean {
  const mobileDigits = (user.mobileNumber || '').replace(/\D/g, '')
  return Boolean(
    user.firstName?.trim() &&
    user.lastName?.trim() &&
    mobileDigits.length >= 10 &&
    user.gender?.trim() &&
    user.age && user.age > 0 &&
    user.state?.trim()
  )
}
