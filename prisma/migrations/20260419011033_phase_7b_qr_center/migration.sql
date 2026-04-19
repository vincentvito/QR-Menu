-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "qrCenterText" TEXT,
ADD COLUMN     "qrCenterType" TEXT NOT NULL DEFAULT 'none';
