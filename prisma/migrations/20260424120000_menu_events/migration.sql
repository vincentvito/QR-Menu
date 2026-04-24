-- Public-menu telemetry. One row per event fired from the guest-facing
-- menu. Dashboard analytics aggregate at query time.
--
-- sessionId is a random anonymous id set in a cookie on the public menu
-- (no PII, no cross-site). restaurantId and menuId carry the scope.

-- CreateTable
CREATE TABLE "menu_event" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "sessionId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_event_restaurantId_createdAt_idx"
  ON "menu_event"("restaurantId", "createdAt");

CREATE INDEX "menu_event_restaurantId_type_createdAt_idx"
  ON "menu_event"("restaurantId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "menu_event" ADD CONSTRAINT "menu_event_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_event" ADD CONSTRAINT "menu_event_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "menu"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
