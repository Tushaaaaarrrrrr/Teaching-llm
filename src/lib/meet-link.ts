/**
 * Meeting-link normalisation.
 *
 * Teachers occasionally paste Meet links with a `class.genziitian.in/` prefix
 * attached (a habit from a Google Workspace short link). When such a value
 * lands in the DB and we render `<a href="class.genziitian.in/https://..."/>`
 * the browser treats it as a *relative* URL — clicking on a PC takes the user
 * to `genziitian.in/class.genziitian.in/https://...` which 404s.
 *
 * This helper unwraps the prefix, ensures a real protocol, and returns null
 * for anything that doesn't look like a usable URL — so call-sites can render
 * a disabled state instead of a broken anchor.
 *
 * Examples:
 *   "class.genziitian.in/https://meet.google.com/xoi" → "https://meet.google.com/xoi"
 *   "https://class.genziitian.in/https://meet.google.com/xoi" → "https://meet.google.com/xoi"
 *   "https://meet.google.com/xoi"                     → "https://meet.google.com/xoi"
 *   "meet.google.com/xoi"                             → "https://meet.google.com/xoi"
 *   ""  /  null  /  "   "                             → null
 */
export function normalizeMeetLink(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let s = raw.trim()
  if (!s) return null

  // Strip the genziitian.in redirect prefix in either bare or http(s) form.
  // Tolerant of `www.`, leading slash, and a single or repeated occurrence.
  const prefixRe = /^(?:https?:\/\/)?(?:www\.)?(?:class\.)?genziitian\.in\/+/i
  while (prefixRe.test(s)) {
    s = s.replace(prefixRe, '')
  }
  s = s.trim()
  if (!s) return null

  // If the remainder already has a protocol, accept it as-is when it looks
  // like a sane absolute URL. Otherwise prepend https:// so the anchor isn't
  // interpreted as a relative path.
  if (/^https?:\/\//i.test(s)) {
    try {
      // Validate via URL parser — invalid URLs throw.
      new URL(s)
      return s
    } catch {
      return null
    }
  }

  // No protocol — must at least contain a `.` somewhere to look like a domain.
  if (!s.includes('.')) return null
  const withProto = `https://${s}`
  try {
    new URL(withProto)
    return withProto
  } catch {
    return null
  }
}
