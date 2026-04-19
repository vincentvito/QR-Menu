-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "qrBackgroundColor" TEXT NOT NULL DEFAULT '#FDFCFB',
ADD COLUMN     "qrCornerStyle" TEXT NOT NULL DEFAULT 'square',
ADD COLUMN     "qrDotStyle" TEXT NOT NULL DEFAULT 'square',
ADD COLUMN     "qrForegroundColor" TEXT NOT NULL DEFAULT '#1C1917';
