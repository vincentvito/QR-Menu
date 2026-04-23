-- Phase 5: drop the restaurant-scoped columns from Organization now that
-- every read/write goes through Restaurant. Also promote Menu.restaurantId
-- to NOT NULL — the phase-1 backfill + onboarding guarantee every menu has
-- a restaurant, and the code no longer tolerates nulls.

-- AlterTable
ALTER TABLE "menu" ALTER COLUMN "restaurantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "currency",
DROP COLUMN "description",
DROP COLUMN "facebookUrl",
DROP COLUMN "googleReviewUrl",
DROP COLUMN "headerImage",
DROP COLUMN "headerTextColor",
DROP COLUMN "instagramUrl",
DROP COLUMN "primaryColor",
DROP COLUMN "qrBackgroundColor",
DROP COLUMN "qrCenterText",
DROP COLUMN "qrCenterType",
DROP COLUMN "qrCornerStyle",
DROP COLUMN "qrDotStyle",
DROP COLUMN "qrForegroundColor",
DROP COLUMN "seasonalOverlay",
DROP COLUMN "secondaryColor",
DROP COLUMN "sourceUrl",
DROP COLUMN "templateId",
DROP COLUMN "theme",
DROP COLUMN "tiktokUrl",
DROP COLUMN "wifiCenterText",
DROP COLUMN "wifiCenterType",
DROP COLUMN "wifiEncryption",
DROP COLUMN "wifiPassword",
DROP COLUMN "wifiSsid";
