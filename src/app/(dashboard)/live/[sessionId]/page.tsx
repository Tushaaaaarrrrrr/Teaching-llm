'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface EventDetail {
  id: string
  title: string
  description: string | null
  courseId: string | null
  course?: { id: string; name: string; color: string } | null
  instructorId: string | null
  instructor?: { id: string; name: string } | null
  streamProvider: string
  streamStatus: string
  agoraChannelName: string | null
  startedLiveAt: string | null
  endedLiveAt: string | null
}

interface MeResponse {
  user?: { id: string; name: string; role: string }
}

type Phase = 'loading' | 'waiting' | 'connecting' | 'live' | 'ended' | 'error'

export default function LiveSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = String(params?.sessionId || '')

  const { data: me } = useSWR<MeResponse>('/api/auth/me', fetcher)
  const { data: event, mutate: refetchEvent } = useSWR<EventDetail>(
    sessionId ? `/api/events/${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 },
  )

  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [audienceMuted, setAudienceMuted] = useState(false)
  const [hostStarting, setHostStarting] = useState(false)
  const [hostEnding, setHostEnding] = useState(false)

  // Refs for Agora SDK objects (created lazily client-side).
  const clientRef = useRef<any>(null)
  const localVideoTrackRef = useRef<any>(null)
  const localAudioTrackRef = useRef<any>(null)
  const remoteContainerRef = useRef<HTMLDivElement>(null)
  const selfContainerRef = useRef<HTMLDivElement>(null)
  const joinedRef = useRef(false)

  const isHost =
    !!event && !!me?.user &&
    (
      (event.instructorId && event.instructorId === me.user.id) ||
      me.user.role === 'MANAGER' ||
      me.user.role === 'SUPER_ADMIN'
    )

  // Cleanup helper — leave channel, stop + close local tracks.
  const cleanup = useCallback(async () => {
    try {
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop()
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop()
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }
      if (clientRef.current && joinedRef.current) {
        await clientRef.current.leave().catch(() => {})
        joinedRef.current = false
      }
      clientRef.current = null
    } catch (e) {
      console.warn('Cleanup error', e)
    }
  }, [])

  // Mint a token and join the channel.
  const joinChannel = useCallback(async (role: 'host' | 'audience') => {
    if (joinedRef.current) return
    setPhase('connecting')
    setError('')

    try {
      const tokenRes = await fetch('/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: sessionId }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) {
        setError(tokenData.error || 'Failed to get streaming token')
        setPhase('error')
        return
      }

      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      clientRef.current = client
      await client.setClientRole(role)

      // Wire remote user events BEFORE join so we don't miss anything.
      client.on('user-published', async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'video' && remoteContainerRef.current) {
          // Render this remote user's video into the container. Replace any
          // existing child so we always show the most recent host.
          remoteContainerRef.current.innerHTML = ''
          user.videoTrack?.play(remoteContainerRef.current)
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play()
        }
      })
      client.on('user-unpublished', (user: any, mediaType: string) => {
        if (mediaType === 'video' && remoteContainerRef.current) {
          remoteContainerRef.current.innerHTML = ''
        }
      })

      await client.join(tokenData.appId, tokenData.channelName, tokenData.token, tokenData.uid)
      joinedRef.current = true

      if (role === 'host') {
        const [micTrack, camTrack] = await Promise.all([
          AgoraRTC.createMicrophoneAudioTrack(),
          AgoraRTC.createCameraVideoTrack({ encoderConfig: '480p_1' }),
        ])
        localAudioTrackRef.current = micTrack
        localVideoTrackRef.current = camTrack
        if (selfContainerRef.current) camTrack.play(selfContainerRef.current)
        await client.publish([micTrack, camTrack])
      }

      setPhase('live')
    } catch (err: any) {
      console.error('Agora join failed', err)
      setError(err?.message || 'Could not connect to the live stream')
      setPhase('error')
      await cleanup()
    }
  }, [sessionId, cleanup])

  // Audience auto-joins when streamStatus flips to LIVE; host joins only
  // when they press Go Live. Cleanup runs on unmount or session ending.
  useEffect(() => {
    if (!event || !me?.user) return

    if (event.streamProvider !== 'AGORA') {
      setError('This session is not configured for in-app live streaming.')
      setPhase('error')
      return
    }
    if (event.streamStatus === 'ENDED') {
      setPhase('ended')
      return
    }
    if (event.streamStatus === 'SCHEDULED') {
      setPhase(isHost ? 'waiting' : 'waiting')
      return
    }
    // streamStatus === 'LIVE'
    if (!joinedRef.current && phase !== 'connecting' && phase !== 'live') {
      joinChannel(isHost ? 'host' : 'audience')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.streamStatus, event?.streamProvider, me?.user?.id, isHost])

  useEffect(() => () => { cleanup() }, [cleanup])

  // Host actions
  async function handleGoLive() {
    if (!event || hostStarting) return
    setHostStarting(true)
    setError('')
    try {
      const res = await fetch('/api/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to start session')
        return
      }
      await refetchEvent()
      await joinChannel('host')
    } catch {
      setError('Could not start the session')
    } finally {
      setHostStarting(false)
    }
  }

  async function handleEndSession() {
    if (!event || hostEnding) return
    setHostEnding(true)
    try {
      await fetch('/api/live/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      })
    } catch {
      // Best effort — still cleanup + redirect
    }
    await cleanup()
    await refetchEvent()
    setPhase('ended')
    setHostEnding(false)
  }

  async function toggleCamera() {
    const track = localVideoTrackRef.current
    if (!track) return
    const next = !cameraOn
    await track.setEnabled(next)
    setCameraOn(next)
  }

  async function toggleMic() {
    const track = localAudioTrackRef.current
    if (!track) return
    const next = !micOn
    await track.setEnabled(next)
    setMicOn(next)
  }

  async function toggleAudienceAudio() {
    const client = clientRef.current
    if (!client) return
    const next = !audienceMuted
    client.remoteUsers.forEach((u: any) => {
      if (next) u.audioTrack?.setVolume(0)
      else u.audioTrack?.setVolume(100)
    })
    setAudienceMuted(next)
  }

  const accent = event?.course?.color || '#6366f1'

  return (
    <div className="page-container fade-in" style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div style={{ minWidth: 0 }}>
          <button
            onClick={() => router.push('/live')}
            style={{ background: 'none', border: 'none', color: '#6b6b8a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Live Sessions
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1e1e3a', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {event?.title || 'Live Session'}
          </h1>
          <p style={{ fontSize: '12.5px', color: '#9999b0', fontWeight: 600, marginTop: '4px' }}>
            {event?.course?.name || 'Course'} · {isHost ? 'Hosting as instructor' : 'Joining as audience'}
          </p>
        </div>
        <StatusPill phase={phase} accent={accent} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600, marginBottom: '14px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* Video stage */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: '#0f172a',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px -20px rgba(15, 23, 42, 0.35)',
      }}>
        {/* Remote (everyone except host sees this; host sees nothing here unless someone else publishes) */}
        <div ref={remoteContainerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Host self-preview — sits as picture-in-picture for host, full-screen until they go live */}
        {isHost && (
          <div
            ref={selfContainerRef}
            style={{
              position: 'absolute',
              inset: phase === 'live' ? 'auto 16px 16px auto' : 0,
              width: phase === 'live' ? '180px' : '100%',
              height: phase === 'live' ? '108px' : '100%',
              background: '#0f172a',
              borderRadius: phase === 'live' ? '14px' : 0,
              overflow: 'hidden',
              boxShadow: phase === 'live' ? '0 8px 24px rgba(0,0,0,0.40), 0 0 0 2px rgba(255,255,255,0.10)' : 'none',
              transition: 'all 0.3s ease',
              zIndex: 2,
            }}
          />
        )}

        {/* Phase overlays */}
        {(phase === 'loading' || phase === 'connecting' || phase === 'waiting' || phase === 'ended') && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            background: phase === 'waiting' || phase === 'ended' ? 'rgba(15, 23, 42, 0.65)' : 'transparent',
            backdropFilter: phase === 'waiting' || phase === 'ended' ? 'blur(4px)' : undefined,
            zIndex: 1, padding: '20px', textAlign: 'center',
          }}>
            {phase === 'loading' && <Spinner />}
            {phase === 'connecting' && (
              <>
                <Spinner />
                <div style={{ marginTop: '14px', fontSize: '14px', fontWeight: 700 }}>Connecting to the live class…</div>
              </>
            )}
            {phase === 'waiting' && (
              <>
                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px' }}>
                  {isHost ? 'Ready when you are' : 'Waiting for the instructor'}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                  {isHost
                    ? 'Click Go Live to start broadcasting. Students will join automatically.'
                    : 'The session will start any moment now.'}
                </div>
              </>
            )}
            {phase === 'ended' && (
              <>
                <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px' }}>Session ended</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Thanks for joining. You can close this tab.</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
        {isHost ? (
          <>
            {phase === 'waiting' && (
              <button
                onClick={handleGoLive}
                disabled={hostStarting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 28px', borderRadius: '50px', border: 'none', cursor: hostStarting ? 'default' : 'pointer',
                  background: hostStarting ? '#cbd5e1' : '#ef4444', color: '#ffffff',
                  fontWeight: 800, fontSize: '15px', fontFamily: 'inherit',
                  boxShadow: hostStarting ? 'none' : '0 10px 24px rgba(239,68,68,0.40)',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
                {hostStarting ? 'Starting…' : 'Go Live'}
              </button>
            )}
            {phase === 'live' && (
              <>
                <IconButton onClick={toggleMic} active={micOn} accent={accent} label={micOn ? 'Mute mic' : 'Unmute mic'}>
                  {micOn
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
                </IconButton>
                <IconButton onClick={toggleCamera} active={cameraOn} accent={accent} label={cameraOn ? 'Turn off camera' : 'Turn on camera'}>
                  {cameraOn
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
                </IconButton>
                <button
                  onClick={handleEndSession}
                  disabled={hostEnding}
                  style={{
                    padding: '12px 22px', borderRadius: '50px', border: 'none', cursor: hostEnding ? 'default' : 'pointer',
                    background: '#1e1e3a', color: '#ffffff', fontWeight: 800, fontSize: '14px', fontFamily: 'inherit',
                    boxShadow: '0 8px 18px rgba(30,30,58,0.30)',
                  }}
                >
                  {hostEnding ? 'Ending…' : 'End Session'}
                </button>
              </>
            )}
          </>
        ) : (
          phase === 'live' && (
            <IconButton onClick={toggleAudienceAudio} active={!audienceMuted} accent={accent} label={audienceMuted ? 'Unmute audio' : 'Mute audio'}>
              {audienceMuted
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            </IconButton>
          )
        )}
      </div>
    </div>
  )
}

function StatusPill({ phase, accent }: { phase: Phase; accent: string }) {
  const map: Record<Phase, { label: string; bg: string; color: string }> = {
    loading:    { label: 'Loading',    bg: '#f1f5f9', color: '#475569' },
    waiting:    { label: 'Scheduled',  bg: '#fef3c7', color: '#b45309' },
    connecting: { label: 'Connecting', bg: '#e0e7ff', color: '#4338ca' },
    live:       { label: 'LIVE',       bg: '#fee2e2', color: '#dc2626' },
    ended:      { label: 'Ended',      bg: '#f1f5f9', color: '#475569' },
    error:      { label: 'Error',      bg: '#fee2e2', color: '#dc2626' },
  }
  const cfg = map[phase]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 12px', borderRadius: '50px',
      background: cfg.bg, color: cfg.color,
      fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {phase === 'live' && (
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%', background: cfg.color,
          animation: 'liveDotPulse 1.5s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
      <style>{`@keyframes liveDotPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.4); } }`}</style>
    </span>
  )
}

function IconButton({
  onClick, active, accent, label, children,
}: { onClick: () => void; active: boolean; accent: string; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: active ? '#ffffff' : '#fef2f2',
        color: active ? accent : '#dc2626',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.10)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" style={{ animation: 'liveSpin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
      <style>{`@keyframes liveSpin { 100% { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}
