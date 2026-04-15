-- Safe additive backfill for production runtime fields/tables.
-- No existing data is deleted or rewritten.

-- Course/Class fields used by /api/courses, /api/classes and community routes
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "googleGroupEmail" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isCommunityActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isDisabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "isGlobal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;

CREATE INDEX IF NOT EXISTS "Class_lastMessageAt_idx" ON "Class"("lastMessageAt");

-- User metadata used by unread counters and token validation
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenCommunityAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenNotificationsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenSupportAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Community moderation/read-state fields used by chat routes
ALTER TABLE "CommunityMessage" ADD COLUMN IF NOT EXISTS "isSystemDeleted" BOOLEAN NOT NULL DEFAULT false;

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

-- Progress tracking delegates used by analytics/lecture progress routes
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

-- Analytics delegates used by reports/data-analysis routes
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
