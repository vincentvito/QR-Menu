-- Wipe the 2 placeholder subscription rows created by the phase-1 backfill.
-- They were never real subscriptions (status='incomplete', no Stripe ids) —
-- real rows will be created by the @better-auth/stripe plugin on first
-- checkout. Clearing them lets the referenceId NOT NULL add below succeed.
TRUNCATE TABLE "subscription";

-- DropForeignKey
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_organizationId_fkey";

-- DropIndex
DROP INDEX "subscription_organizationId_key";

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "maxRestaurantsOverride" INTEGER,
ADD COLUMN     "monthlyCreditsOverride" INTEGER,
ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "subscription" DROP COLUMN "currentPeriodEnd",
DROP COLUMN "maxRestaurantsOverride",
DROP COLUMN "monthlyCreditsOverride",
DROP COLUMN "organizationId",
DROP COLUMN "stripePriceId",
DROP COLUMN "trialEndsAt",
ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "referenceId" TEXT NOT NULL,
ADD COLUMN     "seats" INTEGER,
ADD COLUMN     "stripeScheduleId" TEXT,
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ALTER COLUMN "plan" DROP DEFAULT,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "subscription_referenceId_idx" ON "subscription"("referenceId");
