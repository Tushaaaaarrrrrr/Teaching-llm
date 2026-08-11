export const ABOUT_ME_MAX_WORDS = 300

export function countWords(value: string | null | undefined): number {
  const trimmed = (value || '').trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
