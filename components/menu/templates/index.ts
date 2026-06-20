import { CategoryTilesTemplate } from './category-tiles/CategoryTilesTemplate'
import { DefaultTemplate } from './default/DefaultTemplate'
import { PhotoGridTemplate } from './photo-grid/PhotoGridTemplate'
import { PolaroidTemplate } from './polaroid/PolaroidTemplate'
import type { TemplateDef } from './types'

export const TEMPLATES: TemplateDef[] = [
  DefaultTemplate,
  PhotoGridTemplate,
  CategoryTilesTemplate,
  PolaroidTemplate,
]

export const DEFAULT_TEMPLATE_ID = DefaultTemplate.id

export function getTemplate(id: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? DefaultTemplate
}

// Resolves which template to actually render given the owner's "show item
// images" preference. Photo-first templates fall back to the Editorial
// layout when images are hidden — a photo grid/deck with no photos is just
// placeholders, whereas Editorial is a clean text menu. Text-forward
// templates keep their own layout and drop thumbnails themselves.
export function getDisplayTemplate(
  id: string | null | undefined,
  showImages: boolean,
): TemplateDef {
  const template = getTemplate(id)
  if (!showImages && template.photoFirst) return DefaultTemplate
  return template
}

export function isTemplateId(value: unknown): value is string {
  return typeof value === 'string' && TEMPLATES.some((t) => t.id === value)
}

export type { TemplateDef, TemplateBodyProps, TemplateItem } from './types'
