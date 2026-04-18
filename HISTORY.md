# History

Purpose: keep a technically accurate, chronological record of repository work so we can reconstruct what changed, in what order, and why.

Update rule: whenever code, schema, deployment configuration, or production recovery work is changed, append a new numbered entry to this file.

Entry format:
- Date and time
- Summary
- What changed
- What was added
- What was removed
- Files affected
- Outcome

1. Date and time: 2026-04-15 18:30:06 IST
Summary: Created `HISTORY.md` to maintain a running technical log of edits, rollback actions, and recovery work.
What changed:
- Added a plain-text engineering history file at the repository root.
- Defined a consistent entry structure for future updates.
What was added:
- `HISTORY.md`
- Logging rules for future edits
What was removed:
- Nothing
Files affected:
- `HISTORY.md`
Outcome:
- The repository now has a dedicated change log that can be updated after each technical task.

2. Date and time: 2026-04-15 18:30:06 IST
Summary: Rolled the repository back to commit `c62bf27` to test whether the dashboard issue was caused by newer code.
What changed:
- Hard-reset local `main` to `c62bf2781582929c577d6831d5e1d2589ff33c5b`.
- Force-pushed `origin/main` to the same commit.
- Discarded tracked local changes that existed before the reset.
What was added:
- No new files or code
What was removed:
- Tracked local modifications present before the hard reset
Files affected:
- Entire tracked worktree via `git reset --hard`
- Remote branch `origin/main`
Outcome:
- Local and GitHub were aligned to `c62bf27`, but the `/manage`, `/courses`, and `/community` runtime issue still reproduced, which showed the problem was not solved by code rollback alone.

3. Date and time: 2026-04-15 18:30:06 IST
Summary: Diagnosed the dashboard failure as a runtime/schema mismatch rather than a pure frontend regression.
What changed:
- Investigated the current Prisma schema, API routes, and migration history.
- Verified that client pages were depending on course/community API responses that could fail at runtime.
- Confirmed that the migration history was missing additive runtime fields and tables used by current code.
What was added:
- Root-cause analysis linking the failure to runtime database/schema drift
What was removed:
- The earlier assumption that rollback alone would restore stability
Files affected:
- Read-only investigation across:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `src/app/api/courses/route.ts`
  - `src/app/api/classes/route.ts`
  - `src/app/api/unread/route.ts`
  - `src/app/api/community/[courseId]/messages/route.ts`
  - `src/app/(dashboard)/manage/page.tsx`
  - `src/app/(dashboard)/community/page.tsx`
  - `src/app/(dashboard)/courses/page.tsx`
Outcome:
- Established that the white screen was caused by API/runtime failures propagating into client render code.

4. Date and time: 2026-04-15 18:30:06 IST
Summary: Implemented a production recovery fix for the dashboard pages and added a safe additive migration for the missing runtime database pieces.
What changed:
- Hardened `/manage`, `/community`, and `/courses` so they no longer assume every API response is a valid array payload.
- Added explicit error handling so failed API responses render an inline error state instead of crashing the React client.
- Added a new Prisma migration to backfill missing runtime fields and tables used by current course/community code.
What was added:
- Error-safe fetchers and payload guards in:
  - `src/app/(dashboard)/manage/page.tsx`
  - `src/app/(dashboard)/community/page.tsx`
  - `src/app/(dashboard)/courses/page.tsx`
- Migration:
  - `prisma/migrations/20260415190000_backfill_runtime_course_community_schema/migration.sql`
- Additive DB support for:
  - `Class.lastMessageAt`
  - `Class.isCommunityActive`
  - `Class.isDisabled`
  - `Class.isDemo`
  - `Class.isFree`
  - `Class.isGlobal`
  - `Class.teacherName`
  - `Class.googleGroupEmail`
  - `User.lastSeenCommunityAt`
  - `User.lastSeenNotificationsAt`
  - `User.lastSeenSupportAt`
  - `User.tokenVersion`
  - `CommunityMessage.isSystemDeleted`
  - `CommunityReadState`
  - `LectureProgress`
  - `LectureProgressQueue`
  - `AnalyticsSnapshot`
  - `AnalyticsCourseDaily`
  - `AnalyticsConfig`
What was removed:
- Client-side assumptions that invalid API responses would still be iterable
Files affected:
- `src/app/(dashboard)/manage/page.tsx`
- `src/app/(dashboard)/community/page.tsx`
- `src/app/(dashboard)/courses/page.tsx`
- `prisma/migrations/20260415190000_backfill_runtime_course_community_schema/migration.sql`
Outcome:
- The app build passed locally after the fix.
- The repair was committed as `0d7adfb` with message: `fix(runtime): recover dashboard pages and backfill course schema`.
- The fix was pushed to `main` so Render can deploy it and run the migration during deployment.

5. Date and time: 2026-04-18 10:37:07 IST
Summary: Deployed pending database migration locally/manually because automatic deployment didn't trigger DB sync.
What changed:
- Executed `npm run db:migrate:deploy` to apply the `20260415190000_backfill_runtime_course_community_schema` migration directly to the Supabase database.
What was added:
- DB structural backfill was successfully appended to the live schema.
What was removed:
- None
Files affected:
- None (database sync only)
Outcome:
- Resolved the `PrismaClientKnownRequestError` on `GET /api/courses`. The manager portal (and all dashboard views for students/admins) can now load courses properly.
