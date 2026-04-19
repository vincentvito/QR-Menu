-- AlterTable
ALTER TABLE "organization"
  ADD COLUMN "wifiSsid" TEXT,
  ADD COLUMN "wifiPassword" TEXT,
  ADD COLUMN "wifiEncryption" TEXT NOT NULL DEFAULT 'WPA';
