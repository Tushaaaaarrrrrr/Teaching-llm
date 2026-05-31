import { RtcTokenBuilder, RtcRole } from 'agora-token'
import crypto from 'crypto'

// Token TTL — 1 hour is the Agora default. Long enough for a full lecture
// without exposing the credential too long if it leaks. Clients refresh
// before expiry via the renew flow on the SDK.
const TOKEN_TTL_SECONDS = 60 * 60

export type AgoraRole = 'HOST' | 'AUDIENCE'

export interface MintedAgoraToken {
  appId: string
  channelName: string
  uid: number
  role: AgoraRole
  token: string
  expiresAt: number // unix seconds
}

/**
 * Deterministically hash a user id (cuid string) to a 32-bit unsigned int
 * for use as the Agora numeric UID. Same user id always maps to the same
 * UID, which keeps the SDK happy across reconnects.
 */
export function userIdToAgoraUid(userId: string): number {
  const hash = crypto.createHash('sha256').update(userId).digest()
  // First 4 bytes → 32-bit unsigned int. Mask to 31 bits to stay within
  // a safe signed-int range; Agora requires uid < 2^32 anyway.
  const v = hash.readUInt32BE(0) & 0x7fffffff
  // UID 0 has special meaning (auto-assigned by Agora) — bump to 1.
  return v === 0 ? 1 : v
}

/**
 * Builds an RTC token for the given channel + role. Throws if Agora
 * credentials are missing (e.g. env not configured on this environment).
 */
export function mintAgoraRtcToken(params: {
  channelName: string
  userId: string
  role: AgoraRole
}): MintedAgoraToken {
  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  if (!appId || !appCertificate) {
    throw new Error('Agora credentials are not configured on this server.')
  }

  const uid = userIdToAgoraUid(params.userId)
  const role = params.role === 'HOST' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
  const nowSecs = Math.floor(Date.now() / 1000)
  const expiresAt = nowSecs + TOKEN_TTL_SECONDS

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    params.channelName,
    uid,
    role,
    TOKEN_TTL_SECONDS, // tokenExpire
    TOKEN_TTL_SECONDS, // privilegeExpire
  )

  return {
    appId,
    channelName: params.channelName,
    uid,
    role: params.role,
    token,
    expiresAt,
  }
}

/**
 * Builds a stable Agora channel name from a CourseEvent id. Channel names
 * have to match `[A-Za-z0-9!#$%&()+,-:;<=.>?@[\]^_`{|}~]+` and be ≤ 64 chars.
 * cuid characters all fall in that set, so we prefix with `evt_` for clarity.
 */
export function eventIdToChannelName(eventId: string): string {
  return `evt_${eventId}`
}
