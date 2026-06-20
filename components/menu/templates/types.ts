import type { ComponentType } from 'react'
import type { CategoryIconId } from '@/lib/menus/category-icon'
import type { MenuItemVariant } from '@/lib/menus/variants'

// Shape every template component receives. Matches what PublicMenuBody has
// already filtered + grouped, so templates focus on rendering.
export interface TemplateItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  // Size/price variants. Non-empty list wins over `price` for display.
  variants: MenuItemVariant[]
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
  // Whether dish photos should be shown. When false (the owner turned off
  // "show item images" in Settings) templates render a clean text-only
  // layout — no thumbnails, no "no photo" placeholders. Photo-first
  // templates aren't rendered in this state at all; the host swaps them
  // for the Editorial layout (see `photoFirst` + getDisplayTemplate).
  // Defaults to true when omitted.
  showImages?: boolean
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
  // Photo-first layouts (grid/deck) that only make sense with photos. When
  // the owner hides item images, the host renders the Editorial layout
  // instead of this one, so guests get an intentional text menu rather
  // than a wall of "no photo" placeholders. Text-forward templates leave
  // this unset and simply drop their thumbnails when showImages is false.
  photoFirst?: boolean
  // Rendered inside the public menu's <main>. Owns specials + category
  // sections. Must use shared primitives (PriceChip, BadgeRow) so brand
  // decisions survive across templates.
  Body: ComponentType<TemplateBodyProps>
}
