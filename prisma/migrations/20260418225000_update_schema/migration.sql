-- ============================================================================
-- COMPREHENSIVE SCHEMA SYNC MIGRATION
-- Ensures ALL tables and columns in schema.prisma exist in the production DB.
-- Fully idempotent — safe to run on any database state.
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "EnrollmentType" AS ENUM ('LIVE', 'RECORDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── USER TABLE: Add all columns missing from 0_init ────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobileNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canCreateStudents" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canTerminate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperManager" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isGoogleUser" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "encryptedTempPassword" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastDailyDigestAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastViolationAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "violationCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "genderChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isProfileComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenCommunityAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenNotificationsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenSupportAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- ─── ENROLLMENT TABLE ───────────────────────────────────────────────────────
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "isFreeEnrollment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "type" "EnrollmentType" NOT NULL DEFAULT 'LIVE';
CREATE INDEX IF NOT EXISTS "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX IF NOT EXISTS "Enrollment_classId_idx" ON "Enrollment"("classId");

-- ─── COURSE (CLASS) TABLE: Add missing control columns ─────────────────────
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "googleGroupEmail" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isCommunityActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isDisabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
CREATE INDEX IF NOT EXISTS "Class_lastMessageAt_idx" ON "Class"("lastMessageAt");

-- ─── COURSE BUNDLES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CourseBundle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseBundle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CourseBundle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CourseBundle_createdById_name_key" ON "CourseBundle"("createdById", "name");

CREATE TABLE IF NOT EXISTS "CourseBundleCourse" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    CONSTRAINT "CourseBundleCourse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CourseBundleCourse_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseBundleCourse_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CourseBundleCourse_bundleId_classId_key" ON "CourseBundleCourse"("bundleId", "classId");
CREATE INDEX IF NOT EXISTS "CourseBundleCourse_bundleId_idx" ON "CourseBundleCourse"("bundleId");
CREATE INDEX IF NOT EXISTS "CourseBundleCourse_classId_idx" ON "CourseBundleCourse"("classId");

CREATE TABLE IF NOT EXISTS "UserCourseBundleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCourseBundleAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserCourseBundleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCourseBundleAssignment_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "CourseBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserCourseBundleAssignment_userId_bundleId_key" ON "UserCourseBundleAssignment"("userId", "bundleId");
CREATE INDEX IF NOT EXISTS "UserCourseBundleAssignment_userId_idx" ON "UserCourseBundleAssignment"("userId");
CREATE INDEX IF NOT EXISTS "UserCourseBundleAssignment_bundleId_idx" ON "UserCourseBundleAssignment"("bundleId");

-- ─── MATERIAL TABLE: Add missing columns ────────────────────────────────────
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'FILE';
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN NOT NULL DEFAULT false;
-- Make classId nullable if it isn't already (no-op if already nullable)
ALTER TABLE "Material" ALTER COLUMN "classId" DROP NOT NULL;

-- ─── COURSE EVENT TABLE (replaces old LiveSession/CalendarEvent) ────────────
CREATE TABLE IF NOT EXISTS "CourseEvent" (
    "id" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "meetLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "type" TEXT NOT NULL DEFAULT 'class',
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "originalStartTime" TIMESTAMP(3),
    "recurrence" TEXT DEFAULT 'ONETIME',
    "interval" INTEGER,
    "parentId" TEXT,
    "instructorId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CourseEvent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CourseEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseEvent_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CourseEvent_classId_idx" ON "CourseEvent"("classId");
CREATE INDEX IF NOT EXISTS "CourseEvent_startTime_idx" ON "CourseEvent"("startTime");
CREATE INDEX IF NOT EXISTS "CourseEvent_createdById_idx" ON "CourseEvent"("createdById");
CREATE INDEX IF NOT EXISTS "CourseEvent_type_idx" ON "CourseEvent"("type");
CREATE INDEX IF NOT EXISTS "CourseEvent_isGlobal_idx" ON "CourseEvent"("isGlobal");

-- ─── DAILY SESSION SNAPSHOT ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DailySessionSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "meetLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "classId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "instructorId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "DailySessionSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailySessionSnapshot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DailySessionSnapshot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DailySessionSnapshot_snapshotDate_idx" ON "DailySessionSnapshot"("snapshotDate");
CREATE INDEX IF NOT EXISTS "DailySessionSnapshot_sourceEventId_idx" ON "DailySessionSnapshot"("sourceEventId");
CREATE INDEX IF NOT EXISTS "DailySessionSnapshot_classId_idx" ON "DailySessionSnapshot"("classId");
CREATE UNIQUE INDEX IF NOT EXISTS "DailySessionSnapshot_snapshotDate_sourceEventId_key" ON "DailySessionSnapshot"("snapshotDate", "sourceEventId");

-- ─── TOPIC SHARED CONTENT ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TopicSharedContent" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicSharedContent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TopicSharedContent_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicSharedContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TopicSharedContent_topicId_contentId_key" ON "TopicSharedContent"("topicId", "contentId");
CREATE INDEX IF NOT EXISTS "TopicSharedContent_topicId_idx" ON "TopicSharedContent"("topicId");
CREATE INDEX IF NOT EXISTS "TopicSharedContent_contentId_idx" ON "TopicSharedContent"("contentId");

-- ─── CONTENT TABLE: Add missing columns ─────────────────────────────────────
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "isRecordingOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Content" ADD COLUMN IF NOT EXISTS "videoSource" TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE';

-- ─── ANNOUNCEMENT TABLE: Add missing columns ───────────────────────────────
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "pollId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Announcement_pollId_key" ON "Announcement"("pollId");

-- ─── POLL TABLES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Poll" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cachedResults" TEXT,
    "lastResultsUpdate" TIMESTAMP(3),
    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PollResponse" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollResponse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PollResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PollResponse_pollId_userId_key" ON "PollResponse"("pollId", "userId");

-- Add FK from Announcement to Poll (safe: skips if already exists)
DO $$ BEGIN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── EXAM TABLES ────────────────────────────────────────────────────────────
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "examType" TEXT NOT NULL DEFAULT 'FINAL_TEST';
ALTER TABLE "ExamQuestion" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "ExamQuestion" ADD COLUMN IF NOT EXISTS "questionBankId" TEXT;
ALTER TABLE "ExamAttempt" ADD COLUMN IF NOT EXISTS "bonusMarks" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "ExamAttempt" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- ─── CHAT MESSAGE: Add missing columns ──────────────────────────────────────
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isSystemDeleted" BOOLEAN NOT NULL DEFAULT false;

-- ─── ACTIVITY LOG: Add missing columns ──────────────────────────────────────
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "isFailure" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

-- ─── NOTIFICATION: Add missing columns ──────────────────────────────────────
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "announcementId" TEXT;

-- ─── FAQ TABLE ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- ─── COMMENT TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Comment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Comment_contentId_idx" ON "Comment"("contentId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

-- ─── QUESTION BANK ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionBank" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "imageUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marks" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionBank_subject_idx" ON "QuestionBank"("subject");

-- ─── SYSTEM UPDATE TABLES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SystemUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "showDelay" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ctaLink" TEXT,
    "ctaText" TEXT,
    "courseIds" TEXT NOT NULL DEFAULT '',
    "frequency" TEXT NOT NULL DEFAULT 'ONCE',
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "animation" TEXT,
    "endDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    CONSTRAINT "SystemUpdate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SystemUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SystemUpdate_type_idx" ON "SystemUpdate"("type");
CREATE INDEX IF NOT EXISTS "SystemUpdate_isActive_idx" ON "SystemUpdate"("isActive");
CREATE INDEX IF NOT EXISTS "SystemUpdate_createdById_idx" ON "SystemUpdate"("createdById");

CREATE TABLE IF NOT EXISTS "UpdateView" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UpdateView_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UpdateView_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "SystemUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UpdateView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UpdateView_updateId_userId_key" ON "UpdateView"("updateId", "userId");
CREATE INDEX IF NOT EXISTS "UpdateView_userId_idx" ON "UpdateView"("userId");

-- ─── UPDATE SYSTEM SETTINGS (SINGLETON) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UpdateSystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UpdateSystemSettings_pkey" PRIMARY KEY ("id")
);
-- Ensure singleton row exists
INSERT INTO "UpdateSystemSettings" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;

-- ─── HELP CARD CONFIG (SINGLETON) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HelpCardConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "title" TEXT NOT NULL DEFAULT 'Need Help?',
    "description" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT 'Enroll in More',
    "redirectUrl" TEXT NOT NULL DEFAULT 'mailto:support@example.com',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "HelpCardConfig_pkey" PRIMARY KEY ("id")
);

-- ─── EXAM COUNTDOWN ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamCountdown" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Upcoming Exam',
    "deadlineDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamCountdown_pkey" PRIMARY KEY ("id")
);

-- ─── FEEDBACK TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherRating" INTEGER NOT NULL,
    "conceptRating" INTEGER NOT NULL,
    "materialRating" INTEGER NOT NULL,
    "recommendScore" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Feedback_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Feedback_studentId_classId_key" ON "Feedback"("studentId", "classId");
CREATE INDEX IF NOT EXISTS "Feedback_studentId_idx" ON "Feedback"("studentId");
CREATE INDEX IF NOT EXISTS "Feedback_classId_idx" ON "Feedback"("classId");

-- Drop examRating from Feedback if it exists (schema removed it)
ALTER TABLE "Feedback" DROP COLUMN IF EXISTS "examRating";

-- ─── SYNC QUEUE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SyncQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processAt" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SyncQueue_processed_idx" ON "SyncQueue"("processed");
CREATE INDEX IF NOT EXISTS "SyncQueue_processAt_idx" ON "SyncQueue"("processAt");

-- ─── GROUP SYNC TABLES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GroupSyncJob" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "groupEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupSyncJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupSyncJob_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GroupSyncJob_status_attemptCount_idx" ON "GroupSyncJob"("status", "attemptCount");
CREATE INDEX IF NOT EXISTS "GroupSyncJob_classId_idx" ON "GroupSyncJob"("classId");
CREATE INDEX IF NOT EXISTS "GroupSyncJob_userEmail_idx" ON "GroupSyncJob"("userEmail");
CREATE INDEX IF NOT EXISTS "GroupSyncJob_createdAt_idx" ON "GroupSyncJob"("createdAt");

CREATE TABLE IF NOT EXISTS "GroupSyncLock" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupSyncLock_pkey" PRIMARY KEY ("id")
);
INSERT INTO "GroupSyncLock" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;

-- ─── ANALYTICS TABLES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "returningUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "avgCoursesPerStudent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyActivity" TEXT,
    "topCourses" TEXT,
    "courseDistribution" TEXT,
    "demographics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_key" ON "AnalyticsSnapshot"("date");
CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

CREATE TABLE IF NOT EXISTS "AnalyticsCourseDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
    "growthDelta" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsCourseDaily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCourseDaily_date_courseId_key" ON "AnalyticsCourseDaily"("date", "courseId");
CREATE INDEX IF NOT EXISTS "AnalyticsCourseDaily_date_idx" ON "AnalyticsCourseDaily"("date");
CREATE INDEX IF NOT EXISTS "AnalyticsCourseDaily_courseId_idx" ON "AnalyticsCourseDaily"("courseId");

CREATE TABLE IF NOT EXISTS "AnalyticsConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cronIntervalHours" INTEGER NOT NULL DEFAULT 24,
    CONSTRAINT "AnalyticsConfig_pkey" PRIMARY KEY ("id")
);
INSERT INTO "AnalyticsConfig" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;

-- ─── LECTURE PROGRESS TABLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LectureProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LectureProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LectureProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LectureProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LectureProgress_userId_contentId_key" ON "LectureProgress"("userId", "contentId");
CREATE INDEX IF NOT EXISTS "LectureProgress_userId_idx" ON "LectureProgress"("userId");
CREATE INDEX IF NOT EXISTS "LectureProgress_contentId_idx" ON "LectureProgress"("contentId");

CREATE TABLE IF NOT EXISTS "LectureProgressQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LectureProgressQueue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LectureProgressQueue_processed_idx" ON "LectureProgressQueue"("processed");
CREATE INDEX IF NOT EXISTS "LectureProgressQueue_userId_idx" ON "LectureProgressQueue"("userId");

-- ─── COMMUNITY READ STATE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommunityReadState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityReadState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommunityReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityReadState_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityReadState_userId_classId_key" ON "CommunityReadState"("userId", "classId");
CREATE INDEX IF NOT EXISTS "CommunityReadState_userId_idx" ON "CommunityReadState"("userId");
CREATE INDEX IF NOT EXISTS "CommunityReadState_classId_idx" ON "CommunityReadState"("classId");

-- ─── LOGIN LOG: Add index ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LoginLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ─── SUPPORT TICKET: Add missing indexes ────────────────────────────────────
CREATE INDEX IF NOT EXISTS "SupportTicket_classId_idx" ON "SupportTicket"("classId");
CREATE INDEX IF NOT EXISTS "SupportTicket_studentId_idx" ON "SupportTicket"("studentId");

-- ─── COMMUNITY MESSAGE: Add missing indexes ────────────────────────────────
CREATE INDEX IF NOT EXISTS "CommunityMessage_classId_idx" ON "CommunityMessage"("classId");
CREATE INDEX IF NOT EXISTS "CommunityMessage_senderId_idx" ON "CommunityMessage"("senderId");

-- ─── EXAM indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Exam_classId_idx" ON "Exam"("classId");
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Exam_externalId_key" ON "Exam"("externalId");
CREATE INDEX IF NOT EXISTS "Exam_externalId_idx" ON "Exam"("externalId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_examId_idx" ON "ExamAttempt"("examId");
CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_idx" ON "ExamAttempt"("userId");

-- ─── ACTIVITY LOG indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- ─── LECTURE indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Lecture_classId_idx" ON "Lecture"("classId");
CREATE INDEX IF NOT EXISTS "Lecture_uploadedById_idx" ON "Lecture"("uploadedById");

-- ─── MATERIAL indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Material_classId_idx" ON "Material"("classId");
CREATE INDEX IF NOT EXISTS "Material_uploadedById_idx" ON "Material"("uploadedById");

-- ─── TOPIC indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Topic_classId_idx" ON "Topic"("classId");
