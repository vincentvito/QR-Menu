import type { ComponentType } from 'react'

// Shape every template component receives. Matches what PublicMenuBody has
// already filtered + grouped, so templates focus on rendering.
export interface TemplateItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  tags: string[]
  badges: string[]
  imageUrl: string | null
}

export interface TemplateCategoryGroup {
  category: string
  id: string
  items: TemplateItem[]
}

export interface TemplateBodyProps {
  groups: TemplateCategoryGroup[]
  specials: TemplateItem[]
  specialsAnchorId: string
  symbol: string
  onOpenImage: (src: string) => void
  // When true, templates must render image thumbnails as non-interactive
  // elements (<div> instead of <button>). Used by TemplatePreview, which
  // is itself inside a picker <button> — nested buttons are invalid HTML.
  preview?: boolean
}

export interface TemplateDef {
  id: string
  label: string
  description: string
  // Rendered inside the public menu's <main>. Owns specials + category
  // sections. Must use shared primitives (PriceChip, BadgeRow) so brand
  // decisions survive across templates.
  Body: ComponentType<TemplateBodyProps>
}
