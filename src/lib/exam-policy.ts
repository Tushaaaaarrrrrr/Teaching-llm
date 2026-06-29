export function isFinalTest(examType?: string | null) {
  return (examType || 'FINAL_TEST') === 'FINAL_TEST'
}

export const EXAM_RESULT_REFRESH_INTERVAL_MS = 30_000
export const EXAM_SUBMISSION_VISIBILITY_DELAY_MS = 60_000
export const DEFAULT_FINAL_TEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function allowsMultipleAttempts(examType?: string | null) {
  return !isFinalTest(examType)
}

export function hasStrictTimer(examType?: string | null) {
  return isFinalTest(examType)
}

export function shouldHideAnswersForStudent(
  examType: string | null | undefined, 
  hasSubmitted: boolean, 
  hasEnded: boolean, 
  isPublished: boolean,
  attemptIsPublished: boolean = false
) {
  if (hasEnded) {
    // Once the exam deadline has passed, always show answers to students
    return false
  }

  if (isFinalTest(examType)) {
    // Hide if hasn't ended OR isn't published OR the specific attempt results aren't published
    return !hasEnded || !isPublished || !attemptIsPublished
  }

  return !hasSubmitted
}

