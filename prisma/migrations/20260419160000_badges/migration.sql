-- AlterTable
ALTER TABLE "menu_item"
  ADD COLUMN "badges" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "organization"
  ADD COLUMN "disabledBadges" TEXT[] DEFAULT ARRAY[]::TEXT[];
