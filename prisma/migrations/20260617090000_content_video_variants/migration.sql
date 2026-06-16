-- Per-quality Drive file ID overrides for the in-app quality picker.
-- Default playback continues to use `videoUrl`; this JSON column overlays
-- it with `{ "360p": "<fileId>", "720p": "<fileId>", "1080p": "<fileId>" }`
-- when a manager has uploaded multiple resolutions.
ALTER TABLE "Content" ADD COLUMN "videoVariants" JSONB;
