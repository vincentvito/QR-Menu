import { CategoryTilesBody } from './CategoryTilesBody'
import type { TemplateDef } from '@/components/menu/templates/types'

// Server-safe metadata for the Category Tiles template. Importing this
// from the API route gives us access to `.id` on the server without the
// whole file being turned into a client-module proxy (which would make
// isTemplateId('category-tiles') return false). The Body — which owns
// the hooks/event handlers — lives in the 'use client' sibling file.
export const CategoryTilesTemplate: TemplateDef = {
  id: 'category-tiles',
  label: 'Category tiles',
  description:
    'Lands on big square category tiles. Tap one to browse its dishes. Search lives with the category nav at the bottom.',
  chrome: 'bottom',
  Body: CategoryTilesBody,
}
