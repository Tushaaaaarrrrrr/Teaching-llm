-- Per-user push notification category toggles for the Flutter app's
-- Notification Settings screen. Default true so existing users continue
-- receiving pushes; opt-out is explicit per category.
--
-- IF NOT EXISTS so the migration is idempotent — earlier deploy attempts
-- may have left a partial state in some environments and we want every
-- redeploy to converge to the schema in `schema.prisma` cleanly.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifAnnouncementsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifCommunityEnabled" BOOLEAN NOT NULL DEFAULT true;
