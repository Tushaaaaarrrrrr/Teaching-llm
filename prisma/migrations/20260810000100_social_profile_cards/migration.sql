-- Add user-controlled Social Card profile fields.
ALTER TABLE "User" ADD COLUMN "aboutMe" TEXT;
ALTER TABLE "User" ADD COLUMN "cgpa" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "showStateOnSocialCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showAgeOnSocialCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showGenderOnSocialCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showIitmLevelOnSocialCard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "showCgpaOnSocialCard" BOOLEAN NOT NULL DEFAULT false;

-- Manager/Admin-assigned public badges.
CREATE TABLE "UserBadge" (
  "id" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX "UserBadge_assignedById_idx" ON "UserBadge"("assignedById");

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- User reports. Reporter identity is available only to authorized staff APIs.
CREATE TABLE "UserReport" (
  "id" TEXT NOT NULL,
  "reportedUserId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserReport_reportedUserId_idx" ON "UserReport"("reportedUserId");
CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX "UserReport_status_idx" ON "UserReport"("status");
CREATE INDEX "UserReport_createdAt_idx" ON "UserReport"("createdAt");

ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserReportAudit" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserReportAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserReportAudit_reportId_idx" ON "UserReportAudit"("reportId");
CREATE INDEX "UserReportAudit_actorId_idx" ON "UserReportAudit"("actorId");

ALTER TABLE "UserReportAudit" ADD CONSTRAINT "UserReportAudit_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "UserReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReportAudit" ADD CONSTRAINT "UserReportAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
