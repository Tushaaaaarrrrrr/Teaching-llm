import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  IITM_LEVELS,
  IITM_SUBJECTS_BY_LEVEL,
} from '@/lib/iitm-taxonomy'

export const dynamic = 'force-dynamic'

/**
 * GET /api/free-resources/materials/options
 *
 * Returns the level + subject vocabulary the Flutter app and web pages use
 * to populate their Level / Subject dropdowns.
 *
 * The response merges two sources:
 *  1. The curated IITM BS taxonomy in `@/lib/iitm-taxonomy` — fixed list of
 *     levels (Foundation / Diploma / Degree) and the standard subjects under
 *     each. This guarantees the dropdowns are usable from day 1, before any
 *     materials are uploaded.
 *  2. Distinct `level` + `subject` values across the live free-materials
 *     catalogue. Anything a manager uploads with a custom subject (e.g. a
 *     new elective the seed list doesn't know about) flows through here so
 *     the dropdown shows it too.
 *
 * Shape:
 *   {
 *     levels:    ["Foundation", "Diploma", "Degree", ...],
 *     subjects:  ["Maths 1", "Stats 1", ...],
 *     bySubject: { "Foundation": ["Maths 1", ...], "Diploma": [...] }
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

  // Seed sets with the curated taxonomy so the dropdowns are pre-populated
  // even with an empty DB.
  const levelSet = new Set<string>(IITM_LEVELS)
  const subjectSet = new Set<string>()
  const bySubject: Record<string, Set<string>> = {}
  for (const lvl of IITM_LEVELS) {
    bySubject[lvl] = new Set<string>(IITM_SUBJECTS_BY_LEVEL[lvl])
    for (const s of IITM_SUBJECTS_BY_LEVEL[lvl]) subjectSet.add(s)
  }

  // Layer in whatever the live catalogue currently uses so manager-defined
  // subjects (e.g. a niche elective) still appear.
  for (const r of rows as Array<{ level: string | null; subject: string | null }>) {
    if (r.level) {
      levelSet.add(r.level)
      bySubject[r.level] ??= new Set<string>()
    }
    if (r.subject) subjectSet.add(r.subject)
    if (r.level && r.subject) bySubject[r.level].add(r.subject)
  }

  // Levels keep curated order at the top, custom levels appended at the end.
  const curatedLevels = new Set<string>(IITM_LEVELS)
  const customLevels = Array.from(levelSet).filter(l => !curatedLevels.has(l)).sort()
  const orderedLevels = [...IITM_LEVELS, ...customLevels]

  return NextResponse.json({
    levels: orderedLevels,
    subjects: Array.from(subjectSet).sort(),
    bySubject: Object.fromEntries(
      Object.entries(bySubject).map(([k, v]) => [k, Array.from(v).sort()]),
    ),
  })
}
