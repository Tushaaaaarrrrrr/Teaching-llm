-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "EnrollmentType" AS ENUM ('LIVE', 'RECORDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "type" "EnrollmentType" NOT NULL DEFAULT 'LIVE';

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN IF EXISTS "examRating";
