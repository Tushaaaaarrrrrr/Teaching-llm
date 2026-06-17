-- Per-user push-notification category toggles for the Flutter app's
-- Notification Settings screen. Default ON so existing users continue
-- receiving pushes; opt-out is explicit per category.
--
-- IF NOT EXISTS so the migration is idempotent — production was patched
-- manually at one point and the column may or may not already be there.
-- Without this guard, `prisma migrate deploy` errored with
-- "column already exists" and blocked every subsequent deploy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifAnnouncementsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifCommunityEnabled" BOOLEAN NOT NULL DEFAULT true;
