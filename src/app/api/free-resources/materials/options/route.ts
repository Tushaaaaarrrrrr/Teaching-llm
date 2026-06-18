import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/free-resources/materials/options
 *
 * Returns the distinct level + subject values currently in use across the
 * free-material catalogue, so the Flutter browser can populate its Level and
 * Subject dropdowns without hard-coding the taxonomy.
 *
 * Shape:
 *   {
 *     levels: ["Foundation", "Diploma", ...],
 *     subjects: ["Math 1", "Stats 1", ...],
 *     bySubject: { "Foundation": ["Math 1", "Stats 1"], ... }
 *   }
 *
 * `bySubject` lets the UI restrict the Subject picker to subjects that
 * actually exist for the selected Level, so a student never picks a combo
 * with zero materials.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await (prisma.material.findMany as any)({
    where: { isFree: true, courseId: null },
    select: { level: true, subject: true },
  })

  const levelSet = new Set<string>()
  const subjectSet = new Set<string>()
  const bySubject: Record<string, Set<string>> = {}

  for (const r of rows as Array<{ level: string | null; subject: string | null }>) {
    if (r.level) {
      levelSet.add(r.level)
      bySubject[r.level] ??= new Set<string>()
    }
    if (r.subject) subjectSet.add(r.subject)
    if (r.level && r.subject) bySubject[r.level].add(r.subject)
  }

  return NextResponse.json({
    levels: Array.from(levelSet).sort(),
    subjects: Array.from(subjectSet).sort(),
    bySubject: Object.fromEntries(
      Object.entries(bySubject).map(([k, v]) => [k, Array.from(v).sort()]),
    ),
  })
}
