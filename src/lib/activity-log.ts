import { prisma } from '@/lib/db'

export const MODULE = {
  AUTH: 'Authentication',
  USER_MGMT: 'User Management',
  COURSES: 'Courses',
  TOPICS: 'Topics',
  CONTENT: 'Content',
  LECTURES: 'Lectures',
  MATERIALS: 'Materials',
  LIVE_SESSIONS: 'Live Sessions',
  CALENDAR: 'Calendar',
  ANNOUNCEMENTS: 'Announcements',
  COMMUNITY: 'Community',
  SUPPORT: 'Support',
  PROFILE: 'Profile',
  FAQ: 'FAQ',
  EXAMS: 'Exams',
} as const

export const ACTION = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  AVATAR_UPLOADED: 'AVATAR_UPLOADED',
  COURSE_CREATED: 'COURSE_CREATED',
  COURSE_UPDATED: 'COURSE_UPDATED',
  COURSE_DELETED: 'COURSE_DELETED',
  TOPIC_CREATED: 'TOPIC_CREATED',
  TOPIC_UPDATED: 'TOPIC_UPDATED',
  TOPIC_DELETED: 'TOPIC_DELETED',
  CONTENT_CREATED: 'CONTENT_CREATED',
  CONTENT_UPDATED: 'CONTENT_UPDATED',
  CONTENT_DELETED: 'CONTENT_DELETED',
  LECTURE_CREATED: 'LECTURE_CREATED',
  LECTURE_UPDATED: 'LECTURE_UPDATED',
  LECTURE_DELETED: 'LECTURE_DELETED',
  MATERIAL_CREATED: 'MATERIAL_CREATED',
  MATERIAL_UPDATED: 'MATERIAL_UPDATED',
  MATERIAL_DELETED: 'MATERIAL_DELETED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_UPDATED: 'SESSION_UPDATED',
  SESSION_DELETED: 'SESSION_DELETED',
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',
  ANNOUNCEMENT_CREATED: 'ANNOUNCEMENT_CREATED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  TRANSCRIPT_EXPORTED: 'TRANSCRIPT_EXPORTED',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_UPDATED: 'TICKET_UPDATED',
  TICKET_DELETED: 'TICKET_DELETED',
  TICKET_REPLY_SENT: 'TICKET_REPLY_SENT',
  CHAT_STARTED: 'CHAT_STARTED',
  CHAT_JOINED: 'CHAT_JOINED',
  CHAT_CLOSED: 'CHAT_CLOSED',
  CHAT_HISTORY_DELETED: 'CHAT_HISTORY_DELETED',
  FAQ_CREATED: 'FAQ_CREATED',
  FAQ_UPDATED: 'FAQ_UPDATED',
  FAQ_DELETED: 'FAQ_DELETED',
  POLL_CREATED: 'POLL_CREATED',
  POLL_VOTED: 'POLL_VOTED',
  EXAM_CREATED: 'EXAM_CREATED',
  EXAM_SUBMITTED: 'EXAM_SUBMITTED',
} as const

interface LogActivityParams {
  userId: string
  userName: string
  userRole: string
  securityNumber?: string | null
  actionType: string
  actionDescription: string
  moduleName: string
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}

export function logActivity(params: LogActivityParams): void {
  prisma.activityLog
    .create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        securityNumber: params.securityNumber || null,
        actionType: params.actionType,
        actionDescription: params.actionDescription,
        moduleName: params.moduleName,
        targetId: params.targetId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
    .catch((error) => {
      console.error('Failed to log activity:', error)
    })
}
