-- Add Google Group mapping to courses
ALTER TABLE "Class"
ADD COLUMN "googleGroupEmail" TEXT;

-- Add async Google group sync jobs table
CREATE TABLE "GroupSyncJob" (
  "id" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "groupEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupSyncJob_status_attemptCount_idx" ON "GroupSyncJob"("status", "attemptCount");
CREATE INDEX "GroupSyncJob_classId_idx" ON "GroupSyncJob"("classId");
CREATE INDEX "GroupSyncJob_userEmail_idx" ON "GroupSyncJob"("userEmail");
CREATE INDEX "GroupSyncJob_createdAt_idx" ON "GroupSyncJob"("createdAt");

ALTER TABLE "GroupSyncJob"
ADD CONSTRAINT "GroupSyncJob_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
