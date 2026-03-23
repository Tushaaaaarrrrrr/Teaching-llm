import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getFullSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getFullSession()
    if (!session || session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cred = await prisma.googleCredential.findUnique({
      where: { userId: session.userId }
    })

    if (!cred) {
      return NextResponse.json({ error: 'Google Calendar not linked' }, { status: 400 })
    }

    let accessToken = cred.accessToken

    // Refresh token if expired
    if (new Date() > cred.expiresAt && cred.refreshToken) {
      const clientId = (process.env.GOOGLE_CLIENT_ID || '990282572765-bn1ls79tuhpa589eiici5r9mr6c98c8h.apps.googleusercontent.com')
      const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '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')
      if (clientId && clientSecret) {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: cred.refreshToken,
            grant_type: 'refresh_token'
          })
        })
        const tokenData = await tokenRes.json()
        if (tokenData.access_token) {
          accessToken = tokenData.access_token
          await prisma.googleCredential.update({
             where: { id: cred.id },
             data: {
               accessToken,
               expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
             }
          })
        }
      }
    }

    // Fetch user's Google Calendar events from a month ago onwards
    const startSync = new Date()
    startSync.setMonth(startSync.getMonth() - 1)
    
    const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cred.calendarId)}/events?timeMin=${startSync.toISOString()}&maxResults=2500&singleEvents=true`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!calRes.ok) {
      console.error('Google Calendar API Error:', await calRes.text())
      return NextResponse.json({ error: 'Failed to fetch events from Google API' }, { status: calRes.status })
    }

    const calData = await calRes.json()
    const events = calData.items || []

    const fetchedEventIds = new Set(events.map((e: any) => e.id))
    
    // Find and delete orphaned events (present in LMS but not in GCal fresh fetch)
    const existingSyncedEvents = await prisma.courseEvent.findMany({
      where: {
        googleEventId: { not: null },
        startTime: { gte: startSync },
        createdById: session.userId
      },
      select: { googleEventId: true }
    })

    const googleIdsToDelete = existingSyncedEvents
      .map(ev => ev.googleEventId!)
      .filter(id => !fetchedEventIds.has(id))

    if (googleIdsToDelete.length > 0) {
      await prisma.courseEvent.deleteMany({
        where: { googleEventId: { in: googleIdsToDelete } }
      })
    }

    let imported = 0
    let skipped = 0

    // Description Bridge format: LMS-COURSE-<courseId>
    const cidRegex = /LMS-COURSE-([\w-]+)/i

    for (const item of events) {
      // Must have a description to contain a CID
      if (!item.description) {
        skipped++
        continue
      }
      
      const match = item.description.match(cidRegex)
      if (!match) {
        skipped++
        continue
      }
      const isGlobal = match[1].toLowerCase() === 'global'
      const courseId = isGlobal ? null : match[1]

      const startTime = item.start?.dateTime || item.start?.date
      const endTime = item.end?.dateTime || item.end?.date

      if (!startTime || !endTime) {
        skipped++
        continue
      }

      // Check for meet link
      const meetLink = item.hangoutLink || (item.location?.includes('meet.google.com') || item.location?.includes('zoom.us') ? item.location : null) || null
      
      let manualStatus = 'NONE'
      if (item.summary?.toLowerCase().includes('[cancelled]') || item.status === 'cancelled') {
        manualStatus = 'CANCELLED'
      } else if (item.summary?.toLowerCase().includes('[rescheduled]')) {
        manualStatus = 'RESCHEDULED'
      }

      const title = item.summary?.replace(/\[(cancelled|rescheduled)\]/i, '').trim() || 'Untitled Session'

      if (!isGlobal) {
        const courseExists = await prisma.course.findUnique({ where: { id: courseId! } })
        if (!courseExists) {
          skipped++
          continue
        }
      }

      let instructorId = null
      const creatorEmail = item.creator?.email || item.organizer?.email
      if (creatorEmail) {
        const potentialInstructor = await prisma.user.findUnique({ where: { email: creatorEmail } })
        if (potentialInstructor) {
          instructorId = potentialInstructor.id
        }
      }

      await prisma.courseEvent.upsert({
        where: { googleEventId: item.id },
        update: {
          title,
          description: item.description,
          courseId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          meetLink,
          manualStatus,
          instructorId
        },
        create: {
          googleEventId: item.id,
          title,
          description: item.description,
          courseId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          meetLink,
          manualStatus,
          createdById: session.userId,
          instructorId,
          type: meetLink ? 'live' : 'class'
        }
      })
      imported++
    }

    // Update the last sync time
    await prisma.googleCredential.update({
      where: { id: cred.id },
      data: { lastSyncAt: new Date() }
    })

    return NextResponse.json({ success: true, imported, skipped, totalFetched: events.length })

  } catch (error) {
    console.error('Calendar Sync Error:', error)
    return NextResponse.json({ error: 'Internal sync error' }, { status: 500 })
  }
}
