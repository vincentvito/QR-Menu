import type { ComponentType } from 'react'
import type { CategoryIconId } from '@/lib/menus/category-icon'

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
  iconId?: CategoryIconId
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
  // Only provided when the template declares chrome='bottom'. The host
  // hides its own sticky search + category pills so the template can
  // render them wherever it wants (typically as a bottom sticky bar).
  query?: string
  onQueryChange?: (next: string) => void
  hasQuery?: boolean
}

export interface TemplateDef {
  id: string
  label: string
  description: string
  // Where the template wants the search + category navigation to live.
  // 'top' (default) lets PublicMenuBody render the sticky chrome it
  // always has. 'bottom' hides that chrome and passes query controls
  // into the template body so it can render its own (e.g. at the
  // bottom of the viewport for a category-first layout).
  chrome?: 'top' | 'bottom'
  // Rendered inside the public menu's <main>. Owns specials + category
  // sections. Must use shared primitives (PriceChip, BadgeRow) so brand
  // decisions survive across templates.
  Body: ComponentType<TemplateBodyProps>
}
