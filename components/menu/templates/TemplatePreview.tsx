'use client'

import { useMemo } from 'react'
import { getTemplate } from '@/components/menu/templates'
import {
  DEMO_DISABLED_BADGES,
  DEMO_GROUPS,
  DEMO_SPECIALS,
  DEMO_SYMBOL,
} from '@/components/menu/templates/demo-data'
import type { TemplateCategoryGroup, TemplateItem } from '@/components/menu/templates/types'
import {
  TEMPLATE_PREVIEW_MOCKUP_SIZE,
  TEMPLATE_PREVIEW_SCREEN_INSETS,
} from '@/lib/menus/template-assets'
import { buildInlineStyle } from '@/components/menu/ThemeStyles'
import { getTheme } from '@/lib/menus/themes'
import { SeasonalOverlay } from '@/components/menu/SeasonalOverlay'

export interface TemplatePreviewRealData {
  items: TemplateItem[]
  specialIds: string[]
  symbol: string
  disabledBadges: string[]
}

interface TemplatePreviewProps {
  templateId: string
  mockupUrl: string
  // Brand overrides so the preview renders in the restaurant's colors.
  // Falls through to the default cream/pistachio palette when absent.
  primaryColor?: string | null
  secondaryColor?: string | null
  // When provided, the preview renders the restaurant's actual menu. When
  // null (no menu exists yet), falls back to demo data so the picker still
  // shows something meaningful.
  realData?: TemplatePreviewRealData | null
  // Theme + overlay layered inside the phone mockup. Live-update as the
  // owner picks new options in Settings.
  themeId?: string
  seasonalOverlayId?: string
  // When set, clicking the mockup opens this URL (the live public menu)
  // in a new tab. Also flips the cursor to pointer on hover so the
  // interactive affordance is honest.
  liveUrl?: string | null
}

// Renders the phone mockup with the chosen template inside its screen area.
// The content should render at the viewport's real width so the menu reflows
// like a real phone page rather than being laid out wide and visually scaled.
export function TemplatePreview({
  templateId,
  mockupUrl,
  primaryColor,
  secondaryColor,
  realData,
  themeId,
  seasonalOverlayId = 'none',
  liveUrl,
}: TemplatePreviewProps) {
  const template = getTemplate(templateId)
  const theme = getTheme(themeId)

  const bodyData = useMemo(() => {
    if (!realData) {
      return {
        groups: DEMO_GROUPS,
        specials: DEMO_SPECIALS,
        symbol: DEMO_SYMBOL,
        disabledBadges: DEMO_DISABLED_BADGES,
      }
    }

    const order: string[] = []
    const map = new Map<string, TemplateItem[]>()

    for (const item of realData.items) {
      const key = item.category || 'Other'
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(item)
    }

    const groups: TemplateCategoryGroup[] = order.map((category, i) => ({
      id: `preview-cat-${i}`,
      category,
      items: map.get(category)!,
    }))

    const specialsSet = new Set(realData.specialIds)

    return {
      groups,
      specials: realData.items.filter((it) => specialsSet.has(it.id)),
      symbol: realData.symbol,
      disabledBadges: realData.disabledBadges,
    }
  }, [realData])

  // Theme provides the full palette + heading font. Brand color overrides
  // (if the restaurant has set primary/secondary) replace the theme's
  // accent/pop so the preview honors both layers live.
  const themedStyle = buildInlineStyle(theme, primaryColor, secondaryColor)

  const clickable = Boolean(liveUrl)
  const containerClass = clickable
    ? 'group relative block w-full cursor-pointer transition-transform hover:scale-[1.01]'
    : 'relative block w-full'
  const Wrapper: React.ElementType = clickable ? 'a' : 'div'
  const wrapperProps: Record<string, unknown> = clickable
    ? {
        href: liveUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Open the live menu in a new tab',
      }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      data-theme={theme.id}
      className={containerClass}
      style={{
        aspectRatio: `${TEMPLATE_PREVIEW_MOCKUP_SIZE.width} / ${TEMPLATE_PREVIEW_MOCKUP_SIZE.height}`,
        ...(themedStyle as React.CSSProperties),
      }}
    >
      <div
        className="bg-background text-foreground absolute overflow-hidden"
        style={{
          top: `${TEMPLATE_PREVIEW_SCREEN_INSETS.top * 100}%`,
          right: `${TEMPLATE_PREVIEW_SCREEN_INSETS.right * 100}%`,
          bottom: `${TEMPLATE_PREVIEW_SCREEN_INSETS.bottom * 100}%`,
          left: `${TEMPLATE_PREVIEW_SCREEN_INSETS.left * 100}%`,
          borderRadius: '12%',
        }}
      >
        <div className="relative h-full overflow-x-hidden overflow-y-auto">
          <div className="w-full px-5 pt-0">
            <template.Body
              groups={bodyData.groups}
              specials={bodyData.specials}
              specialsAnchorId="preview-specials"
              symbol={bodyData.symbol}
              disabledBadges={bodyData.disabledBadges}
              preview
              onOpenImage={() => {
                /* no-op */
              }}
            />
          </div>
          {/* Seasonal overlay clipped inside the phone screen */}
          <SeasonalOverlay id={seasonalOverlayId} scope="contained" />
        </div>
      </div>

      {/* Mockup frame on top — transparent screen reveals content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mockupUrl}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </Wrapper>
  )
}
