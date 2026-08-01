-- Move scheduled analytics from a user preference to a restaurant setting.
ALTER TABLE "user"
DROP COLUMN IF EXISTS "weeklyAnalyticsEmailEnabled",
DROP COLUMN IF EXISTS "weeklyAnalyticsEmailLocale",
DROP COLUMN IF EXISTS "weeklyAnalyticsEmailLastSentAt";

ALTER TABLE "restaurant"
ADD COLUMN "analyticsReportFrequency" TEXT NOT NULL DEFAULT 'off',
ADD COLUMN "analyticsReportTimezone" TEXT NOT NULL DEFAULT 'America/Toronto',
ADD COLUMN "analyticsReportLocale" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE "analytics_report_recipient" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "lastSentKey" TEXT,
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analytics_report_recipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_report_recipient_restaurantId_email_key"
ON "analytics_report_recipient"("restaurantId", "email");

CREATE INDEX "analytics_report_recipient_restaurantId_disabledAt_idx"
ON "analytics_report_recipient"("restaurantId", "disabledAt");

ALTER TABLE "analytics_report_recipient"
ADD CONSTRAINT "analytics_report_recipient_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "restaurant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
