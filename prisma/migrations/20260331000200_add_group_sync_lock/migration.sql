-- Add lock table for Google Group sync processing
CREATE TABLE "GroupSyncLock" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "isProcessing" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupSyncLock_pkey" PRIMARY KEY ("id")
);

-- Insert singleton record
INSERT INTO "GroupSyncLock" ("id", "isProcessing", "updatedAt")
VALUES ('singleton', false, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
