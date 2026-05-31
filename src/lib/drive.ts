/**
 * Google Drive helpers for streaming course videos through our own API.
 *
 * Auth resolution order:
 *   1. Service account (preferred) — uses GOOGLE_SERVICE_ACCOUNT_EMAIL + _PRIVATE_KEY
 *      with the `drive.readonly` scope. Files must be shared with the SA email.
 *   2. API key — uses GOOGLE_DRIVE_API_KEY for files that are publicly shared
 *      ("Anyone with the link"). No per-user access control.
 *   3. Anonymous public download — last-resort fallback to
 *      https://drive.google.com/uc?export=download&id=FILE_ID. Works for small
 *      files with "Anyone with the link" sharing; Google may interpose a virus
 *      scan warning page for large files.
 *
 * Mode 1 is the recommended production setup — students cannot share the URL
 * because the proxy requires their auth cookie + enrollment.
 */
import { google, drive_v3 } from 'googleapis'
import type { Readable } from 'stream'

/* Extract a Drive file ID from any of the URL shapes we accept:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/file/d/{ID}/preview
 *   https://drive.google.com/open?id={ID}
 *   https://drive.google.com/uc?id={ID}
 *   {ID}   ← raw id is also accepted
 */
export function extractDriveFileId(input: string | null | undefined): string | null {
  if (!input) return null
  const s = input.trim()
  // Bare id (Drive ids are typically 25–60 chars of [A-Za-z0-9_-])
  if (/^[A-Za-z0-9_-]{15,80}$/.test(s)) return s
  const byPath = s.match(/\/d\/([A-Za-z0-9_-]+)/)
  if (byPath) return byPath[1]
  const byQuery = s.match(/[?&]id=([A-Za-z0-9_-]+)/)
  if (byQuery) return byQuery[1]
  return null
}

export type DriveAuthMode = 'service-account' | 'api-key' | 'public'

export function getDriveAuthMode(): DriveAuthMode {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) return 'service-account'
  if (process.env.GOOGLE_DRIVE_API_KEY) return 'api-key'
  return 'public'
}

let cachedSAClient: drive_v3.Drive | null = null
function getServiceAccountClient(): drive_v3.Drive {
  if (cachedSAClient) return cachedSAClient
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  cachedSAClient = google.drive({ version: 'v3', auth })
  return cachedSAClient
}

/* Fetch a (possibly partial) byte stream for the given file.
 * Returns the readable stream, the HTTP status, and the response headers
 * (content-type, content-length, content-range, accept-ranges, etc).
 *
 * Behavior by auth mode:
 *   - service-account: Drive API files.get({alt: 'media'}) — works for SA-shared files
 *   - api-key:         Drive API with `key` param — public files only
 *   - public:          Direct https://drive.google.com/uc?export=download fetch
 *
 * The Range header is forwarded to Google so <video> seeking works.
 */
export async function fetchDriveFileStream(fileId: string, rangeHeader: string | null): Promise<{
  stream: Readable | ReadableStream<Uint8Array>
  status: number
  headers: Record<string, string>
}> {
  const mode = getDriveAuthMode()
  const requestHeaders: Record<string, string> = {}
  if (rangeHeader) requestHeaders['Range'] = rangeHeader

  if (mode === 'service-account') {
    const drive = getServiceAccountClient()
    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: requestHeaders }
    )
    return { stream: res.data as unknown as Readable, status: (res as any).status || 200, headers: pickHeaders((res as any).headers) }
  }

  if (mode === 'api-key') {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY!
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { headers: requestHeaders })
    if (!res.body) throw new Error('Drive API returned no body')
    return { stream: res.body as ReadableStream<Uint8Array>, status: res.status, headers: pickHeadersFromHeaders(res.headers) }
  }

  // Public-download fallback (last resort)
  const url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
  const res = await fetch(url, { headers: requestHeaders, redirect: 'follow' })
  if (!res.body) throw new Error('Drive public fetch returned no body')
  return { stream: res.body as ReadableStream<Uint8Array>, status: res.status, headers: pickHeadersFromHeaders(res.headers) }
}

function pickHeaders(raw: any): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw) return out
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = raw[k]
    if (typeof v === 'string') out[k] = v
  }
  return out
}
function pickHeadersFromHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = h.get(k)
    if (v) out[k] = v
  }
  return out
}
