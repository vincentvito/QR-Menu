-- AlterTable
ALTER TABLE "menu" ADD COLUMN     "restaurantId" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "bonusCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyCreditsResetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "restaurant" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sourceUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
    "qrCornerStyle" TEXT NOT NULL DEFAULT 'square',
    "qrForegroundColor" TEXT NOT NULL DEFAULT '#1C1917',
    "qrBackgroundColor" TEXT NOT NULL DEFAULT '#FDFCFB',
    "qrCenterType" TEXT NOT NULL DEFAULT 'none',
    "qrCenterText" TEXT,
    "wifiSsid" TEXT,
    "wifiPassword" TEXT,
    "wifiEncryption" TEXT NOT NULL DEFAULT 'WPA',
    "wifiCenterType" TEXT NOT NULL DEFAULT 'none',
    "wifiCenterText" TEXT,
    "googleReviewUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "facebookUrl" TEXT,
    "templateId" TEXT NOT NULL DEFAULT 'default',
    "theme" TEXT NOT NULL DEFAULT 'editorial',
    "seasonalOverlay" TEXT NOT NULL DEFAULT 'none',
    "headerImage" TEXT,
    "headerTextColor" TEXT,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "billingInterval" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "maxRestaurantsOverride" INTEGER,
    "monthlyCreditsOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceMonthlyAfter" INTEGER NOT NULL,
    "balanceBonusAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_member" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'waiter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_invitation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'waiter',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_slug_key" ON "restaurant"("slug");

-- CreateIndex
CREATE INDEX "restaurant_organizationId_idx" ON "restaurant"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_organizationId_key" ON "subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_stripeCustomerId_idx" ON "subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "credit_transaction_organizationId_createdAt_idx" ON "credit_transaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "restaurant_member_userId_idx" ON "restaurant_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_member_restaurantId_userId_key" ON "restaurant_member"("restaurantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_invitation_token_key" ON "restaurant_invitation"("token");

-- CreateIndex
CREATE INDEX "restaurant_invitation_email_idx" ON "restaurant_invitation"("email");

-- CreateIndex
CREATE INDEX "restaurant_invitation_restaurantId_idx" ON "restaurant_invitation"("restaurantId");

-- CreateIndex
CREATE INDEX "menu_restaurantId_idx" ON "menu"("restaurantId");

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_member" ADD CONSTRAINT "restaurant_member_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_member" ADD CONSTRAINT "restaurant_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_invitation" ADD CONSTRAINT "restaurant_invitation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_invitation" ADD CONSTRAINT "restaurant_invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
