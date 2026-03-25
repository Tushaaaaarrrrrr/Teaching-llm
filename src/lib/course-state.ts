export interface CourseStateLike {
  isDisabled?: boolean | null
  expiresAt?: Date | string | null
}

export function isCourseExpired(course: CourseStateLike, now = new Date()) {
  if (!course.expiresAt) return false
  const expiresAt = course.expiresAt instanceof Date ? course.expiresAt : new Date(course.expiresAt)
  return expiresAt.getTime() <= now.getTime()
}

export function isCourseEffectivelyDisabled(course: CourseStateLike, now = new Date()) {
  return !!course.isDisabled || isCourseExpired(course, now)
}

