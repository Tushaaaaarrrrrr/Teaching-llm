export const DELETION_REASONS = [
  { code: 'NO_LONGER_NEEDED', label: 'I no longer need the platform' },
  { code: 'CONTENT_DISSATISFACTION', label: "I'm not satisfied with the courses/content" },
  { code: 'TECHNICAL_PROBLEMS', label: "I'm having technical problems" },
  { code: 'DIFFICULT_TO_USE', label: 'The platform is difficult to use' },
  { code: 'PRICING', label: 'The pricing is too high' },
  { code: 'PRIVACY_CONCERNS', label: 'I have privacy/account concerns' },
  { code: 'SWITCHING_PLATFORM', label: "I'm switching to another learning platform" },
  { code: 'OTHER', label: 'Other' },
] as const

export type DeletionReasonCode = typeof DELETION_REASONS[number]['code']

export const DELETION_STATUS = {
  PENDING: 'PENDING',
  CANCELLED_BY_USER: 'CANCELLED_BY_USER',
  CANCELLED_BY_MANAGER: 'CANCELLED_BY_MANAGER',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  DELETED: 'DELETED',
} as const

export type DeletionStatus = keyof typeof DELETION_STATUS

export const DELETION_EVENT_TYPE = {
  ACCOUNT_DELETION_REQUESTED: 'ACCOUNT_DELETION_REQUESTED',
  ACCOUNT_DELETION_CANCELLED_BY_USER: 'ACCOUNT_DELETION_CANCELLED_BY_USER',
  ACCOUNT_DELETION_CANCELLED_BY_MANAGER: 'ACCOUNT_DELETION_CANCELLED_BY_MANAGER',
  ACCOUNT_DELETION_APPROVED: 'ACCOUNT_DELETION_APPROVED',
  ACCOUNT_DELETION_PROCESSING: 'ACCOUNT_DELETION_PROCESSING',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
} as const

export type DeletionEventType = keyof typeof DELETION_EVENT_TYPE

export function getReasonLabel(code: string): string {
  const match = DELETION_REASONS.find(r => r.code === code)
  return match?.label || code
}
