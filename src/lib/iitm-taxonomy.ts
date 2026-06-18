/**
 * IITM BS curriculum taxonomy. Used as a *base* set for the Free Materials
 * Level/Subject dropdowns so students see the right options even before
 * any materials have been uploaded. The /api/free-resources/materials/options
 * endpoint merges this with the distinct values from the live catalogue,
 * so anything a manager uploads outside this list still appears.
 *
 * Edit this file to add new subjects — both the web and the Flutter app
 * pick up changes immediately (no migration needed, the source of truth
 * is the API response).
 */

export const IITM_LEVELS = ['Foundation', 'Diploma', 'Degree'] as const

export type IitmLevel = (typeof IITM_LEVELS)[number]

/**
 * Subjects per level. Keep label casing exactly how students see them in
 * the official curriculum — these are the values managers will pick from
 * the dropdown on upload, so consistency matters.
 */
export const IITM_SUBJECTS_BY_LEVEL: Record<IitmLevel, string[]> = {
  Foundation: [
    'Maths 1',
    'English 1',
    'Stats 1',
    'CT',
    'Maths 2',
    'Python',
    'English 2',
  ],
  Diploma: [
    'MLF',
    'PDSA',
    'DBMS',
    'MAD 1',
    'MAD 2',
    'MLT',
    'MLP',
    'Java',
  ],
  // Empty for now — fill in once you have the canonical Degree subject list.
  Degree: [],
}

/** Flat sorted list of every curated subject across all levels (deduped). */
export const IITM_ALL_SUBJECTS: string[] = Array.from(
  new Set(Object.values(IITM_SUBJECTS_BY_LEVEL).flat()),
).sort()
