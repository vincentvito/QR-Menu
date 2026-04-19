-- Drop the qrFrameRadius column — the UI slider was removed in favor of
-- a fixed radius that matches the rest of the app.
ALTER TABLE "organization" DROP COLUMN IF EXISTS "qrFrameRadius";
