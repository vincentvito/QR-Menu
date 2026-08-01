-- AlterTable
ALTER TABLE "user"
ADD COLUMN "weeklyAnalyticsEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "weeklyAnalyticsEmailLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN "weeklyAnalyticsEmailLastSentAt" TIMESTAMP(3);
