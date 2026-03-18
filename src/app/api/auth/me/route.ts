import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const user = await (prisma.user as any).findUnique({
    where: { id: session.userId },
    select: { 
      id: true, name: true, email: true, role: true, avatar: true, createdAt: true, 
      canTerminate: true, canCreateStudents: true,
      enrollments: {
        select: {
          course: {
            select: { id: true, name: true, subject: true }
          }
        }
      },
      instructorAssignments: {
        select: {
          course: {
            select: { id: true, name: true, subject: true }
          }
        }
      }
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}
