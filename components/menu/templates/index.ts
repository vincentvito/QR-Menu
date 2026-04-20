import { CategoryTilesTemplate } from './category-tiles/CategoryTilesTemplate'
import { DefaultTemplate } from './default/DefaultTemplate'
import { PhotoGridTemplate } from './photo-grid/PhotoGridTemplate'
import type { TemplateDef } from './types'

export const TEMPLATES: TemplateDef[] = [
  DefaultTemplate,
  PhotoGridTemplate,
  CategoryTilesTemplate,
]

export const DEFAULT_TEMPLATE_ID = DefaultTemplate.id

export function getTemplate(id: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? DefaultTemplate
}

export function isTemplateId(value: unknown): value is string {
  return typeof value === 'string' && TEMPLATES.some((t) => t.id === value)
}

export type { TemplateDef, TemplateBodyProps, TemplateItem } from './types'
