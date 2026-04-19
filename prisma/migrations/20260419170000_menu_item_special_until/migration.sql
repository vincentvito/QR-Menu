-- AlterTable
ALTER TABLE "menu_item"
  ADD COLUMN "specialUntil" TIMESTAMP(3);

-- Index to make "any active specials in this menu?" queries cheap when
-- the public menu page runs.
CREATE INDEX "menu_item_menuId_specialUntil_idx"
  ON "menu_item"("menuId", "specialUntil");
