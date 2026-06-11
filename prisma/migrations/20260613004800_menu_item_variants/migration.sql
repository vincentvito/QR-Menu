-- Optional size/price variants per menu item, e.g. [{"label":"Small","price":12}]
ALTER TABLE "menu_item" ADD COLUMN "variants" JSONB NOT NULL DEFAULT '[]';
