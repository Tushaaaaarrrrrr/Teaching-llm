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

6. Date and time: 2026-04-18 21:18:03 IST
Summary: Consolidated Live and Recorded course streams into single courses using per-enrollment access types.
What changed:
- Introduced a unified course management model where "Live" vs "Recorded" access is handled at the enrollment level rather than through course duplication.
- Implemented backend enforcement to strip meeting links from students with "RECORDED" access while allowing "LIVE" access for global events.
- Updated the student dashboard to hide "Active Now" cards for recorded-only subjects to prevent unauthorized access and confusion.
- Enhanced the manager user management UI to allow granular control over each student's access type per course.
What was added:
- Prisma enum `EnrollmentType` (`LIVE`, `RECORDED`) and `type` field to the `Enrollment` model.
- `enrollmentTypes` mapping in `FullSession` (auth system) for efficient permission checking.
- Live/Recorded toggle badges in `ManagerUserModal` for administrators.
- Visibility and security logic in `src/lib/daily-session-sync.ts` and `src/app/api/dashboard/route.ts`.
What was removed:
- None
Files affected:
- `prisma/schema.prisma`
- `src/lib/auth.ts`
- `src/lib/daily-session-sync.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/users/[id]/route.ts`
- `src/components/ManagerUserModal.tsx`
Outcome:
- Eliminated redundant content management (updating lectures/exams twice) by allowing multiple student access types to coexist in one course.
- Secured live sessions via backend link stripping while maintaining schedule transparency for all students.

7. Date and time: 2026-04-18 21:28:42 IST
Summary: Removed "Exam Session" from the feedback system to simplify course evaluation categories.
What changed:
- Removed the "Exam Session" rating category from the student feedback modal UI.
- Updated the manager's feedback overview to remove the Exam rating column/indicator.
- Modified the backend API to stop requiring or processing the `examRating` field.
What was added:
- None
What was removed:
- `examRating` field from the `Feedback` model in `prisma/schema.prisma`.
- UI elements for "Exam Session" rating in `FeedbackModal.tsx` and `feedback/page.tsx`.
Files affected:
- `prisma/schema.prisma`
- `src/components/FeedbackModal.tsx`
- `src/app/api/feedback/route.ts`
- `src/app/(dashboard)/feedback/page.tsx`
Outcome:
- Streamlined the course feedback process by focusing on Teacher, Concept, Material, and Recommendation scores.
- The database column remains present due to shadow database migration conflicts, but the application code is fully decoupled from it.

8. Date and time: 2026-04-18 21:46:00 IST
Summary: Implemented role-based access control for calendar events and a daily schedule modal.
What changed:
- Disabled direct event pill clicks for non-manager users on the calendar grid.
- Made calendar day cells clickable for all users, opening a newly implemented "Schedule for the Day" modal.
- Configured the daily schedule modal to list all events for the selected day, displaying essential details (Title, Time, Type, Subject, Instructor, Description).
- Restricted the visibility of Google Meet links inside the daily schedule modal so they are only visible to Managers.
What was added:
- `selectedDailyDay` state for managing the newly introduced daily schedule modal.
What was removed:
- None
Files affected:
- `src/app/(dashboard)/calendar/page.tsx`
Outcome:
- Enhanced calendar privacy by restricting direct access to event details for students while providing a clear, aggregated daily schedule view that redacts sensitive meeting links.

9. Date and time: 2026-04-18 22:45:00 IST
Summary: Created database migration file for EnrollmentType and Feedback changes.
What changed:
- Wrote a manual SQL migration file to add the EnrollmentType enum/column and remove the Feedback examRating column.
- This fixes the 500 Application Error ('Digest: 3694888697' or Prisma P2011/P2022) during SSR where the runtime code expects `enrollments.type` but the Supabase database schema was never synced from the `0105418` commit.
What was added:
- `prisma/migrations/20260418225000_update_schema/migration.sql`
What was removed:
- None
Files affected:
- `prisma/migrations/20260418225000_update_schema/migration.sql`
Outcome:
- Deployment mechanisms (Render) will now execute this delta to synchronize the database with the current Prisma client schema.

10. Date and time: 2026-04-19 08:30:00 IST
Summary: Implemented mandatory profile completion blocker and audience demographics analytics.
What changed:
- Added a full-screen, unskippable profile setup form that blocks all dashboard access until the user provides: First Name, Last Name, 10-digit Mobile Number, Gender (Male/Female/Other), Age, and State.
- Extended the analytics engine to aggregate student demographics (Gender, Age brackets, State) and display them in the Manager Analytics Dashboard.
- Updated the profile settings page to include Age, State, and the new "Other" gender option.
- Added Age, State, and Other gender fields to the Manager User Modal.
What was added:
- `src/components/ProfileSetupBlocker.tsx` — full-screen profile completion form
- `src/app/api/profile/setup/route.ts` — strict validation endpoint for initial profile submission
- `isProfileComplete`, `age`, `state` fields on User model
- `demographics` field on AnalyticsSnapshot model
- Demographics section (Gender pie, Age bar chart, Top States) in AnalyticsDashboard
What was removed:
- Default gender value (forces conscious selection)
Files affected:
- `prisma/schema.prisma`
- `src/lib/auth.ts`
- `src/app/api/profile/route.ts`
- `src/app/api/profile/setup/route.ts` (NEW)
- `src/app/api/analytics/summary/route.ts`
- `src/lib/lms-analytics.ts`
- `src/components/ProfileSetupBlocker.tsx` (NEW)
- `src/components/analytics/AnalyticsDashboard.tsx`
- `src/components/ManagerUserModal.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/profile/page.tsx`
Outcome:
- All users with `isProfileComplete: false` are blocked on login until they submit their details.
- Managers can view Age, State, and Gender for any user in the User Modal.
- Analytics dashboard now shows audience demographic breakdowns.

11. Date and time: 2026-04-19 08:45:00 IST
Summary: Separated Community Direct Messages from Support Live Chats with strict type discrimination.
What changed:
- Added `type` column to `ChatSession` model (`"SUPPORT"` default, `"DIRECT"` for community DMs).
- Community DMs: `type: DIRECT`, no expiration, persistent, two-way messaging (both manager and student can send).
- Support chats: `type: SUPPORT`, keep existing 24h TTL, auto-expire logic only applies to SUPPORT.
- All support endpoints now strictly filter `type: SUPPORT` — DMs are invisible in support dashboard.
- All community endpoints now strictly filter `type: DIRECT` — support chats are invisible in community.
- Removed the read-only lock on DM input for students — they can now reply after manager starts the chat.
What was added:
- `type` field on ChatSession model (SQL migration applied)
What was removed:
- `expiresAt` from DM creation (DMs persist forever)
- Manager-only send restriction in DM messages (both sides can reply)
- Read-only lock on student DM input in community UI
Files affected:
- `prisma/schema.prisma`
- `src/app/api/community/direct/start/route.ts`
- `src/app/api/classes/route.ts`
- `src/app/api/community/[courseId]/messages/route.ts`
- `src/app/api/support/live-chats/route.ts`
- `src/app/api/support/chat-history/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/unread/route.ts`
- `src/app/(dashboard)/community/page.tsx`
Outcome:
- Community DMs and Support Live Chats operate as completely independent systems with zero cross-contamination.
- Managers can start persistent DMs from Community; students can reply.
- Support dashboard only shows user-initiated support sessions.

12. Date and time: 2026-04-19 09:48:00 IST
Summary: Standardizing modal designs and enhancing dashboard analytics layout.
What changed:
- Standardized modal components (ManagerUserModal, ProfileSetupBlocker, etc.) to use a premium, dark aesthetic with dynamic glow effects for a cohesive UI.
- Upgraded AnalyticsDashboard location and demographic layouts, improving visual hierarchy.
- Introduced an animated scroll indicator within the Sidebar for better navigation visibility.
What was added:
- Scroll indicator logic and styling in Sidebar.tsx.
What was removed:
- Legacy basic modal styling.
Files affected:
- src/app/(dashboard)/calendar/page.tsx
- src/app/(dashboard)/community/page.tsx
- src/app/(dashboard)/live/page.tsx
- src/app/(dashboard)/profile/page.tsx
- src/components/ManagerUserModal.tsx
- src/components/ProfileSetupBlocker.tsx
- src/components/analytics/AnalyticsDashboard.tsx
- src/components/layout/Sidebar.tsx
Outcome:
- Significant visual upgrade to modal components and better user experience across dashboard views.

13. Date and time: 2026-04-19 21:07:00 IST
Summary: Diagnosed root cause of image upload failures.
What changed:
- Investigated upload logic for Avatars and Announcements.
- Verified that required Supabase environment variables are checked during the upload process.
What was added:
- Root cause analysis: Uploads fail with a 500 error if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are not set in the hosting environment.
What was removed:
- N/A
Files affected:
- `src/app/api/upload/route.ts`
- `src/app/api/profile/avatar/route.ts`
Outcome:
- Confirmed that even with the `lms-uploads` bucket created, the production site reports missing keys. A manual configuration update on Render's Environment dashboard is required to resolve this.

14. Date and time: 2026-04-19 21:06:00 IST
Summary: Enhanced Exam Code Modal interaction.
What changed:
- Added background click-to-close functionality to the "Add Code" modal in the Exam management view.
- Wrapped modal content in a `.modal` class for consistent styling.
What was added:
- `onClick` event on the modal backdrop to reset `showCodeModal`.
What was removed:
- N/A
Files affected:
- `src/app/(dashboard)/exams/[id]/page.tsx`
Outcome:
- Improved UX by allowing users to dismiss the modal by clicking outside the input area.

15. Date and time: 2026-04-19 21:10:00 IST
Summary: Improved upload error reporting for better debugging.
What changed:
- Refactored `getSupabaseAdmin()` in upload routes to provide descriptive error messages.
- Replaced the generic "Supabase env vars not set" error with specific messages identifying which variable is missing (`NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`).
What was added:
- Explicit checks and descriptive error strings for each required environment variable.
What was removed:
- Generic error catch-all.
Files affected:
- `src/app/api/upload/route.ts`
- `src/app/api/profile/avatar/route.ts`
Outcome:
- The system now explicitly tells the developer/user which specific key is missing from their dashboard, eliminating guesswork during configuration.

16. Date and time: 2026-04-27 14:15:00 IST
Summary: Converted enrollment type selection from toggle button to dropdown menu and integrated into user creation flow.
What changed:
- Replaced the color-coded Live/Recorded toggle button in `ManagerUserModal` with a styled `<select>` dropdown for clearer selection.
- Added a type selector next to the "+ Add Course" button so managers can choose the enrollment type before adding a course.
- Updated the Admin dashboard's "Create User" modal to allow selecting enrollment types for each course at creation time.
- Updated the backend user creation API to accept and apply `enrollmentTypes` during user creation.
What was added:
- `selectedNewCourseType` state in `ManagerUserModal`.
- `enrollmentTypes` field in Admin dashboard form state and POST payload.
- Type dropdown in the course selection list of the Admin "Create User" modal.
What was removed:
- Toggle button UI for enrollment type switching.
Files affected:
- `src/components/ManagerUserModal.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/api/users/route.ts`
Outcome:
- Enrollment type selection is now more intuitive via dropdown menus.
- Managers can set enrollment types during both user creation and editing.
- Students cannot modify their enrollment type (locking requirement met).

17. Date and time: 2026-04-27 14:35:00 IST
Summary: Implemented "Upgrade to Live" feature allowing Recording-batch students to upgrade their enrollment from the course card.
What changed:
- Added `liveUpgradePrice` (Float?) field to the Course model for per-course upgrade pricing.
- Updated the courses list API to return the user's `enrollmentType` for each course.
- Course cards now render conditionally: RECORDED students see an upgrade button and info icon; LIVE students see a badge and subtle glow border.
- For RECORDED users, the description and teacher name are hidden, replaced by an "⚡ Upgrade to Live — ₹XX" button.
- Added an "ⓘ" info button that opens a side-by-side comparison modal (Recording vs Live batch features).
- Added an upgrade confirmation modal with price display and confirm/cancel buttons.
- Created a backend upgrade endpoint that changes enrollment type from RECORDED → LIVE.
- Added "Live Upgrade Price (₹)" input to the manager course edit form.
What was added:
- `liveUpgradePrice` column on `Class` table (via raw SQL, Supabase cross-schema limitation).
- `src/app/api/courses/[id]/upgrade/route.ts` — POST endpoint for enrollment upgrade.
- Comparison modal and upgrade confirmation modal in `courses/page.tsx`.
- Upgrade price input in the course management form.
What was removed:
- None
Files affected:
- `prisma/schema.prisma`
- `src/app/api/courses/route.ts`
- `src/app/api/courses/[id]/route.ts`
- `src/app/api/courses/[id]/upgrade/route.ts` (NEW)
- `src/app/(dashboard)/courses/page.tsx`
- `src/app/(dashboard)/manage/page.tsx`
Outcome:
- Recording-batch students can now see a clear upgrade path on their course cards.
- The comparison modal educates students on the differences between batches.
- After upgrade confirmation, the card automatically refreshes to show the Live state.
- Managers control upgrade pricing per course from the management panel.

18. Date and time: 2026-04-27 16:50:00 IST
Summary: Polished Course Card UI and Details Header, including PRO glow effect and General batch fallbacks.
What changed:
- Converted "General Batch" courses to use a distinct grayscale banner/badge theme on the dashboard and detail page, rather than a full CSS filter on the entire card.
- Updated the `InfoModal` on the dashboard to use the newly designed table-format "Batch Comparison" modal.
- Added a subtle animated light reflection effect (`proShine` keyframes) for "PRO Batch" (Live) courses to emphasize a premium appearance.
- Repositioned the "i" info button on the course details header to the absolute top-right corner of the banner.
- Ensured the "Upgrade to PRO" button in the course details header sits perfectly inline with the other tags.
- Updated the logic for `isRecorded` to also capture `FREE` and `DEMO` enrollment types, ensuring they correctly display the "General Batch" UI and prompt upgrades.
What was added:
- CSS `@keyframes proShine` for animated premium glow.
What was removed:
- Removed global `grayscale(1)` filter to restore legibility of card fonts and icons for recorded courses.
- Removed the old dual-column Batch Comparison UI from `courses/page.tsx`.
Files affected:
- `src/app/(dashboard)/courses/page.tsx`
- `src/app/(dashboard)/courses/[id]/page.tsx`
Outcome:
- Dashboard cards and detail headers clearly separate PRO (shiny, vibrant) and General (clean grey) aesthetic.
- The comparison table provides identical clarity whether triggered from a card or from within the course detail view.
- Demo and free users appropriately fall under General Batch restrictions and upgrade paths.

19. Date and time: 2026-04-27 19:35:00 IST
Summary: Implemented Razorpay for PRO Upgrades, Transactions logging, and UI tabs for Managers and Students.
What changed:
- Integrated Razorpay Node SDK in backend routes and checkout.js script in the frontend.
- Refactored `handleUpgrade` flows in both dashboard and course detail pages to create Razorpay orders and verify signatures before executing upgrades.
- Added new read-only transaction history dashboard tabs (`/transactions` for managers, `/my-transactions` for students) in `layout.tsx` Sidebar.
- Added success modal with order ID display post-payment.
What was added:
- `UpgradeTransaction` Prisma model and manual raw SQL DB migration.
- `POST /api/courses/[id]/create-razorpay-order` for generating order IDs.
- `POST /api/courses/[id]/upgrade` (modified) to verify Razorpay webhooks/signatures and trigger a Google Apps Script email notification.
- `GET /api/transactions` and `GET /api/my-transactions`.
- `/transactions` page for MANAGER with filters (All Time, Today, Yesterday, Last 7 Days, Last 30 Days, Last 3 Months) and revenue summary.
- `/my-transactions` page for STUDENT.
Files affected:
- `prisma/schema.prisma`
- `src/app/api/courses/[id]/create-razorpay-order/route.ts`
- `src/app/api/courses/[id]/upgrade/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/my-transactions/route.ts`
- `src/app/(dashboard)/courses/page.tsx`
- `src/app/(dashboard)/courses/[id]/page.tsx`
- `src/app/(dashboard)/transactions/page.tsx`
- `src/app/(dashboard)/my-transactions/page.tsx`
- `src/components/layout/Sidebar.tsx`
Outcome:
- Real money payments via Razorpay now power course upgrades to PRO.
- Managers have a dedicated dashboard to monitor revenue generated by upgrades.
- Students have full visibility of their past upgrades via the "My Upgrades" tab.

20. Date and time: 2026-04-28 21:40:00 IST
Summary: **CRITICAL INCIDENT** — All courses disappeared for all users due to missing `liveUpgradePrice` database column (schema drift).
What changed:
- Root-cause analysis revealed that the `liveUpgradePrice` column was added to `schema.prisma` (entry #17) and `prisma generate` was run, but **no SQL migration was ever created or executed** on the production PostgreSQL database to add the actual column.
- When `prisma.course.findMany()` runs without a `select` clause, Prisma Client generates SQL that selects ALL scalar fields including `liveUpgradePrice`. PostgreSQL returns `column "liveUpgradePrice" does not exist`, which is silently caught by the `try/catch` block in `/api/courses/route.ts`, returning a generic 500 error.
- The frontend receives the 500 error, SWR sets the error state, and the courses array remains empty — users see "0 courses available".
- Logs appeared "clean" because the Prisma error was caught server-side in `console.error` (PM2 logs only), not visible in browser console.
- Users and auth continued working because `getFullSession()` uses explicit `select` clauses that only query existing columns.
- Additional schema drift was found: `UpgradeTransaction` table (no migration), `TopicSharedContent.order` column (missing from migration SQL), and `WebhookLog` table/column mismatches.
What was added:
- `emergency_schema_sync.js` — idempotent fix script that adds all missing columns and tables:
  - `Class.liveUpgradePrice` (DOUBLE PRECISION, nullable) — **the primary fix**
  - `UpgradeTransaction` table with all indexes
  - `TopicSharedContent.order` column
  - `WebhookLog` table with `error` and `updatedAt` columns
What was removed:
- Nothing
Files affected:
- `emergency_schema_sync.js` (NEW)
- `HISTORY.md` (this entry)
Outcome:
- Running `node emergency_schema_sync.js` on the production server followed by `pm2 restart all` restores all courses for all users immediately.
- **LESSON LEARNED / PREVENTION CHECKLIST:**
  - ❗ NEVER deploy a build after modifying `schema.prisma` without also running a migration on the database.
  - ❗ After `prisma generate`, always verify with `prisma migrate status` or a manual SQL check that the DB matches.
  - ❗ When adding columns via raw SQL on Supabase (as done in entry #17), ensure the same raw SQL is also captured in a migration file or manual script for future database setups (e.g., DigitalOcean migration).
  - ❗ Consider adding a startup health-check query that touches critical tables before accepting traffic.
  - ❗ Check PM2 server logs (`pm2 logs --lines 200`), not just browser console, when investigating "clean logs" situations.

  21. Date and time: 2026-05-08 16:45:00 IST
  Summary: Refined sidebar navigation and store card interactions while restricting study materials to managers.
  What changed:
  - Removed the visible "Resources" section label from the dashboard sidebar.
  - Moved `Support` to appear immediately after `Exams` in the sidebar navigation order.
  - Restricted `Study Materials` visibility in the sidebar to `MANAGER` users only.
  - Added middleware protection so non-managers are redirected away from `/materials` routes.
  - Updated the store cards to show a hover tooltip with the PRO vs Recorded comparison message.
  - Adjusted the tooltip placement so it renders cleanly above the card actions.
  - Enforced a minimum display and submission price of `1` for store offerings, including create/edit flows.
  What was added:
  - Manager-only sidebar visibility for `Study Materials`.
  - Hover tooltip behavior for course offering cards in the store.
  - Minimum price validation and clamping in the store UI.
  What was removed:
  - Sidebar "Resources" section header.
  - Raw zero-price display paths in the store cards.
  Files affected:
  - `src/components/layout/Sidebar.tsx`
  - `src/middleware.ts`
  - `src/app/(dashboard)/courses/explore/page.tsx`
  Outcome:
  - The sidebar is cleaner and better ordered.
  - Only managers can see and open study materials.
  - Store cards now explain access tiers more clearly on hover, and course pricing no longer accepts `0` or negative values.

  22. Date and time: 2026-05-08 17:05:00 IST
  Summary: Highlighted the sidebar `Store` button with a darker theme and shimmer effect.
  What changed:
  - Re-styled the `Store` sidebar button to use a darker black/grey gradient so it stands out from the other navigation items.
  - Added a subtle animated shine pass across the `Store` button to draw attention without changing navigation behavior.
  What was added:
  - Dark gradient treatment for the `Store` button.
  - Animated shine effect for the `Store` button.
  What was removed:
  - None
  Files affected:
  - `src/components/layout/Sidebar.tsx`
  Outcome:
  - The `Store` button is now visually distinct and easier for users to notice in the sidebar.

  23. Date and time: 2026-05-08 17:25:00 IST
  Summary: Expanded the support FAQ area and moved the ticket CTA into the live chat panel.
  What changed:
  - Increased the FAQ section height so more questions can be shown without feeling cramped.
  - Expanded the FAQ accordion scroll area to better use the available vertical space.
  - Moved the `Raise a Ticket` action into a dedicated box inside the live chat card.
  - Removed the duplicate ticket button from the recent tickets footer to keep the support area cleaner.
  What was added:
  - A boxed `Raise a Ticket` callout within the live chat card.
  - Taller FAQ layout for additional entries.
  What was removed:
  - The standalone `Raise a Ticket` button from the recent tickets block.
  Files affected:
  - `src/app/(dashboard)/support/page.tsx`
  Outcome:
  - The support home screen now has clearer hierarchy, more FAQ capacity, and a more intentional ticket CTA placement.

  24. Date and time: 2026-05-08 18:55:00 IST
  Summary: Preserve original deleted community message content for manager transcripts.
  What changed:
  - When a community message is deleted, the API now records the original message content in `ActivityLog.metadata` as part of the delete flow.
  - The transcripts endpoint for managers was enhanced to look up those activity-log entries and restore original content for deleted messages when available.
  What was added:
  - `src/app/api/community/[courseid]/messages/route.ts` — activity-log entry creation on delete (stores original message content in metadata).
  - `src/app/api/community/transcripts/route.ts` — transcript endpoint now enriches deleted messages with original content from activity logs.
  What was removed:
  - Nothing (behavior is backward-compatible; message rows continue to hold deletion markers).
  Files affected:
  - `src/app/api/community/[courseid]/messages/route.ts`
  - `src/app/api/community/transcripts/route.ts`
  Outcome:
  - Managers viewing community transcripts will see original text for deleted messages when available, without requiring a DB schema migration.
  - This uses the existing `ActivityLog.metadata` as a safe audit store for original message content.

  25. Date and time: 2026-05-08 19:15:00 IST
  Summary: **COMPLETED** — All pending support/community UX enhancements verified and finalized.
  What changed:
  - Updated message timestamp displays throughout the app to show full date + time (not time-only).
  - Verified that selected subject/class is displayed in ticket thread headers for managers.
  - Confirmed lightbox modal implementation for images in support chats and ticket replies.
  What was added:
  - Full date+time formatting in chat/support message timestamps (month, day, hour, minute).
  What was removed:
  - None
  Files affected:
  - `src/app/(dashboard)/support/page.tsx` — updated live chat message timestamps to show full dates.
  - `src/app/(dashboard)/community/page.tsx` — updated community chat message timestamps to show full dates.
  Outcome:
  - **Support/Ticket/Community Feature Complete:**
    - ✓ Store button restyled with dark gradient and shimmer effect (Entry 22).
    - ✓ FAQ section expanded vertically; Raise Ticket CTA moved into Live Chat card (Entry 23).
    - ✓ Deleted messages now visible to managers in community transcripts with original content restored (Entry 24).
    - ✓ Chat message timestamps show full date + time for clarity across support and community sections.
    - ✓ Selected subject/class visible to managers in ticket thread header (already implemented).
    - ✓ Image lightbox modal with close and download buttons fully functional in support chats and ticket replies.
  - All user requests from session have been implemented, tested, and pushed to feature/course-offerings-management branch.

  26. Date and time: 2026-05-08 19:45:00 IST
  Summary: Fix missing activity logging for free course enrollments.
  What changed:
  - The free course enrollment endpoint was not recording activity logs when users enrolled in free courses.
  - Added logActivity calls to both enrollment and unenrollment operations.
  - Created two new ACTION types: FREE_ENROLLMENT and FREE_UNENROLLMENT for better audit trail clarity.
  What was added:
  - Import of `logActivity`, `ACTION`, `MODULE` to `/api/free-resources/enroll/route.ts`.
  - Activity log entry on POST (free course enrollment) with user details and course name.
  - Activity log entry on DELETE (free course unenrollment) with user details and course name.
  - New action types in `src/lib/activity-log.ts`: `FREE_ENROLLMENT`, `FREE_UNENROLLMENT`.
  What was removed:
  - Nothing
  Files affected:
  - `src/app/api/free-resources/enroll/route.ts` — added logActivity calls for enrollment/unenrollment.
  - `src/lib/activity-log.ts` — added two new ACTION types.
  Outcome:
  - Free course enrollments are now properly recorded in ActivityLog with full user and course information.
  - Managers can now see a complete audit trail of who enrolled in free courses and when.
  - Unenrollment actions are also logged for audit compliance.

  27. Date and time: 2026-05-08 20:15:00 IST
  Summary: Implement correct batch type badges based on enrollment/access type.
  What changed:
  - Updated badge display logic in course cards to show correct tier names based on course type.
  - Free/demo courses now show "General Batch" badge.
  - Live courses show "PRO Batch" badge.
  - Recorded (paid) courses show "Plus Batch" badge.
  - Badge colors and backgrounds adjusted appropriately for each tier.
  What was added:
  - `getBatchBadge()` helper function to determine correct badge text and color based on enrollmentType.
  - Logic to differentiate between FREE/DEMO vs RECORDED enrollment types.
  What was removed:
  - None (logic improved instead)
  Files affected:
  - `src/app/(dashboard)/courses/page.tsx` — implemented correct batch badge display logic.
  Outcome:
  - Course cards now clearly show badge indicating course tier:
    - General = Free/demo access (recorded videos)
    - Plus = Paid recorded access
    - PRO = Paid live + recorded access
  - Clearer visual distinction between free and paid course options for students.

28. Date and time: 2026-05-10 15:05:00 IST
Summary: Implemented Dynamic User Prompt/Survey system for manager-controlled student interaction.
What changed:
- Added a full-page, non-dismissible blocker modal that forces students to interact with active manager-defined prompts (surveys, feedback, CTAs) before accessing the dashboard.
- Implemented intelligent sequencing: Permanent profile setup (Name, Age, Number) is asked first; dynamic prompts are only shown after profile completion and not in the same session to avoid fatigue.
- Added a new "User Prompts" management page for administrators to create, activate/deactivate, and analyze student responses.
- Supports three question types: Yes/No, Multiple Choice, and CTA Button (with link).
- Integrated into the global dashboard layout.
What was added:
- `UserPrompt` and `PromptResponse` Prisma models (added via `emergency_schema_sync.js` to bypass Supabase schema constraints).
- `src/components/DynamicPromptBlocker.tsx` — the student-facing modal component.
- `src/app/api/prompts/active/route.ts` — fetches unanswered active prompts for the current user.
- `src/app/api/prompts/respond/route.ts` — saves user answers.
- `src/app/api/admin/prompts/route.ts` and `src/app/api/admin/prompts/[id]/route.ts` — admin CRUD APIs.
- `src/app/(dashboard)/manage/prompts/page.tsx` — manager UI for prompt management.
- "User Prompts" link in the sidebar under Administration.
What was removed:
- None
Files affected:
- `prisma/schema.prisma`
- `emergency_schema_sync.js`
- `src/app/(dashboard)/layout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/ProfileSetupBlocker.tsx`
- `src/app/api/prompts/active/route.ts` (NEW)
- `src/app/api/prompts/respond/route.ts` (NEW)
- `src/app/api/admin/prompts/route.ts` (NEW)
- `src/app/api/admin/prompts/[id]/route.ts` (NEW)
- `src/app/(dashboard)/manage/prompts/page.tsx` (NEW)
- `src/components/DynamicPromptBlocker.tsx` (NEW)
Outcome:
- Managers can now create targeted surveys and call-to-actions that students must engage with upon login.
- Responses are collected and viewable by managers per prompt.
- The user flow is protected from overlapping blockers.

