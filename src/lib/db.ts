import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrismaDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL

  if (!rawUrl) return undefined

  try {
    const url = new URL(rawUrl)
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com')

    // Supabase pooled connections use a transaction pooler. Prisma needs
    // pgbouncer mode enabled there to avoid prepared statement reuse errors.
    if (isSupabasePooler) {
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true')
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1')
      }
    }

    return url.toString()
  } catch {
    return rawUrl
  }
}

const datasourceUrl = getPrismaDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
