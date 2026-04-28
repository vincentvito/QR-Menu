ALTER TABLE "organization"
ADD COLUMN "compPlan" TEXT,
ADD COLUMN "compReason" TEXT,
ADD COLUMN "compGrantedBy" TEXT,
ADD COLUMN "compGrantedAt" TIMESTAMP(3);
