-- Per-user push-notification category toggles for the Flutter app's
-- Notification Settings screen. Default ON so existing users continue
-- receiving pushes; opt-out is explicit per category.
ALTER TABLE "User" ADD COLUMN "notifAnnouncementsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifCommunityEnabled" BOOLEAN NOT NULL DEFAULT true;
