export function isFinalTest(examType?: string | null) {
  return (examType || 'FINAL_TEST') === 'FINAL_TEST'
}

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

