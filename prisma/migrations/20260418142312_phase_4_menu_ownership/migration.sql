/*
  Warnings:

  - You are about to drop the column `currency` on the `menu` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantName` on the `menu` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `menu` table. All the data in the column will be lost.
  - Added the required column `name` to the `menu` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `menu` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "menu" DROP CONSTRAINT "menu_userId_fkey";

-- DropIndex
DROP INDEX "menu_userId_idx";

-- AlterTable
ALTER TABLE "menu" DROP COLUMN "currency",
DROP COLUMN "restaurantName",
DROP COLUMN "userId",
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL;
