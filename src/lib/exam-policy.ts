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

export function shouldHideAnswersForStudent(examType: string | null | undefined, hasSubmitted: boolean, hasEnded: boolean, isPublished: boolean) {
  if (isFinalTest(examType)) {
    return !hasEnded || !isPublished
  }

  return !hasSubmitted
}
