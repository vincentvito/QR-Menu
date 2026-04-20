'use client'

import { Search, Wifi } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getTemplate } from '@/components/menu/templates'
import { CategoryTilesPreviewChrome } from '@/components/menu/templates/category-tiles/CategoryTilesBody'
import { DEMO_GROUPS, DEMO_SPECIALS, DEMO_SYMBOL } from '@/components/menu/templates/demo-data'
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
}

const PREVIEW_VIEWPORT_WIDTH = 390
const PREVIEW_SCREEN_WIDTH =
  TEMPLATE_PREVIEW_MOCKUP_SIZE.width -
  (TEMPLATE_PREVIEW_SCREEN_INSETS.left + TEMPLATE_PREVIEW_SCREEN_INSETS.right) *
    TEMPLATE_PREVIEW_MOCKUP_SIZE.width
const PREVIEW_SCREEN_HEIGHT =
  TEMPLATE_PREVIEW_MOCKUP_SIZE.height -
  (TEMPLATE_PREVIEW_SCREEN_INSETS.top + TEMPLATE_PREVIEW_SCREEN_INSETS.bottom) *
    TEMPLATE_PREVIEW_MOCKUP_SIZE.height
const PREVIEW_VIEWPORT_HEIGHT =
  PREVIEW_VIEWPORT_WIDTH * (PREVIEW_SCREEN_HEIGHT / PREVIEW_SCREEN_WIDTH)
const PREVIEW_SCREEN_RADIUS = '11.35%'
const PREVIEW_SCREEN_BLEED_X = 1.25
const PREVIEW_SCREEN_BLEED_TOP = 1.25
const PREVIEW_SCREEN_BLEED_BOTTOM = 1.5

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
  restaurantName?: string | null
  menuName?: string | null
  logoUrl?: string | null
  headerImageUrl?: string | null
  // Override for the restaurant name color in the mockup header.
  // Empty/null falls through to the theme's `--background` color.
  headerTextColor?: string | null
  wifiSsid?: string | null
  // When set, clicking the mockup opens this URL (the live public menu)
  // in a new tab. Also flips the cursor to pointer on hover so the
  // interactive affordance is honest.
  liveUrl?: string | null
}

// Renders the phone mockup with the chosen template inside its screen area.
// The content is laid out at a stable mobile viewport width, then scaled
// down to the mockup screen. That keeps proportions closer to the real
// public menu even when the settings panel shows a smaller phone.
export function TemplatePreview({
  templateId,
  mockupUrl,
  primaryColor,
  secondaryColor,
  realData,
  themeId,
  seasonalOverlayId = 'none',
  restaurantName,
  menuName,
  logoUrl,
  headerImageUrl,
  headerTextColor,
  wifiSsid,
  liveUrl,
}: TemplatePreviewProps) {
  const template = getTemplate(templateId)
  const theme = getTheme(themeId)
  const screenRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [contentHeight, setContentHeight] = useState(PREVIEW_VIEWPORT_HEIGHT)

  const bodyData = useMemo(() => {
    if (!realData) {
      return {
        groups: DEMO_GROUPS,
        specials: DEMO_SPECIALS,
        symbol: DEMO_SYMBOL,
        totalItems: DEMO_GROUPS.reduce((sum, group) => sum + group.items.length, 0),
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
      totalItems: realData.items.length,
    }
  }, [realData])

  useEffect(() => {
    const element = screenRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width
      if (!nextWidth) return
      setPreviewScale(nextWidth / PREVIEW_VIEWPORT_WIDTH)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const displayRestaurantName = restaurantName?.trim() || 'Your restaurant'
  const displayMenuName = menuName?.trim() || 'Menu'
  const hasHeaderImage = Boolean(headerImageUrl?.trim())
  const hasWifi = Boolean(wifiSsid?.trim())

  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    const updateHeight = () => {
      setContentHeight(element.scrollHeight)
    }

    updateHeight()

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [bodyData.groups, bodyData.specials, templateId, displayMenuName, displayRestaurantName])

  // Theme provides the full palette + heading font. Brand color overrides
  // (if the restaurant has set primary/secondary) replace the theme's
  // accent/pop so the preview honors both layers live.
  const themedStyle = buildInlineStyle(theme, primaryColor, secondaryColor)

  // When liveUrl is set, render as an anchor so the mockup picks up the
  // native pointer cursor on hover and clicking opens the real menu in
  // a new tab — keeps the "this preview is interactive" affordance
  // honest instead of looking purely decorative.
  const containerClass = `relative block w-full${liveUrl ? ' cursor-pointer' : ''}`
  const Container = liveUrl ? 'a' : 'div'
  const anchorProps = liveUrl
    ? {
        href: liveUrl,
        target: '_blank' as const,
        rel: 'noopener noreferrer',
        'aria-label': 'Open the live menu in a new tab',
      }
    : {}
  const showCategoryNav = bodyData.specials.length > 0 || bodyData.groups.length > 1
  const showBottomChromePreview = template.id === 'category-tiles'

  return (
    <Container
      data-theme={theme.id}
      className={containerClass}
      style={{
        aspectRatio: `${TEMPLATE_PREVIEW_MOCKUP_SIZE.width} / ${TEMPLATE_PREVIEW_MOCKUP_SIZE.height}`,
        ...(themedStyle as React.CSSProperties),
      }}
      {...anchorProps}
    >
      <div
        ref={screenRef}
        className="bg-background text-foreground absolute overflow-hidden"
        style={{
          top: `calc(${TEMPLATE_PREVIEW_SCREEN_INSETS.top * 100}% - ${PREVIEW_SCREEN_BLEED_TOP}px)`,
          right: `calc(${TEMPLATE_PREVIEW_SCREEN_INSETS.right * 100}% - ${PREVIEW_SCREEN_BLEED_X}px)`,
          bottom: `calc(${TEMPLATE_PREVIEW_SCREEN_INSETS.bottom * 100}% - ${PREVIEW_SCREEN_BLEED_BOTTOM}px)`,
          left: `calc(${TEMPLATE_PREVIEW_SCREEN_INSETS.left * 100}% - ${PREVIEW_SCREEN_BLEED_X}px)`,
          borderRadius: PREVIEW_SCREEN_RADIUS,
        }}
      >
        <div className="no-scrollbar relative h-full overflow-x-hidden overflow-y-auto">
          <div style={{ height: `${contentHeight * previewScale}px` }}>
            <div
              ref={contentRef}
              className="relative origin-top-left"
              style={{
                width: `${PREVIEW_VIEWPORT_WIDTH}px`,
                transform: `scale(${previewScale})`,
              }}
            >
              {/* Mockup content wrapper. No `min-h-screen` here: the
                  mockup is a scaled-down mobile snapshot, so the content
                  should size to its natural height. `min-h-screen` would
                  pad the preview with 100vh of empty space whenever the
                  chosen template's content is shorter than the browser
                  viewport (notably the category-tiles layout). */}
              <div className="bg-background text-foreground pb-8">
                <section className="bg-foreground text-background relative overflow-hidden">
                  {hasHeaderImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={headerImageUrl!}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.30) 100%)',
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        aria-hidden="true"
                        className="bg-accent pointer-events-none absolute -top-24 -right-16 h-[360px] w-[360px] rounded-full opacity-[0.12] blur-2xl"
                      />
                      <div
                        aria-hidden="true"
                        className="bg-pop pointer-events-none absolute -bottom-24 -left-16 h-[320px] w-[320px] rounded-full opacity-[0.18] blur-2xl"
                      />
                    </>
                  )}

                  <div className="relative mx-auto flex max-w-[720px] flex-col px-5 pt-6 pb-8">
                    {hasWifi ? (
                      <div className="mb-6 flex justify-end">
                        <span className="bg-background text-foreground ring-foreground/10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] ring-1">
                          <Wifi className="size-3.5" aria-hidden="true" />
                          WiFi
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-start gap-3">
                      {logoUrl ? (
                        <div className="bg-background/10 relative size-12 shrink-0 overflow-hidden rounded-xl backdrop-blur-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <p className="text-accent text-[11px] font-medium tracking-[0.18em] uppercase">
                          {displayMenuName}
                        </p>
                        <h1
                          className="mt-1.5 text-[28px] leading-[1.08] font-semibold tracking-[-0.03em]"
                          style={headerTextColor ? { color: headerTextColor } : undefined}
                        >
                          {displayRestaurantName}
                        </h1>
                        <p className="text-background/70 mt-2 text-xs">
                          {bodyData.totalItems} {bodyData.totalItems === 1 ? 'dish' : 'dishes'}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {template.chrome !== 'bottom' && (
                  <div className="bg-background/80 border-cream-line sticky top-0 z-40 border-b backdrop-blur-md">
                    <div className="mx-auto max-w-[720px] px-5 pt-3">
                      <div className="relative">
                        <Search
                          className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
                          aria-hidden="true"
                        />
                        <div className="border-cream-line bg-card text-muted-foreground flex h-11 items-center rounded-full border pr-4 pl-10 text-[14px]">
                          Search dishes, ingredients, tags...
                        </div>
                      </div>
                    </div>

                    {showCategoryNav ? (
                      <nav
                        aria-label="Menu categories"
                        className="no-scrollbar scroll-fade-x mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-5 py-3"
                      >
                        {bodyData.specials.length > 0 && (
                          <span className="bg-pop text-pop-foreground shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap">
                            Today&apos;s Specials
                          </span>
                        )}
                        {bodyData.groups.map((group) => (
                          <span
                            key={group.id}
                            className="bg-card text-foreground shrink-0 rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap"
                          >
                            {group.category}
                          </span>
                        ))}
                      </nav>
                    ) : (
                      <div className="h-3" aria-hidden="true" />
                    )}
                  </div>
                )}

                <main className="mx-auto max-w-[720px] px-5">
                  <template.Body
                    groups={bodyData.groups}
                    specials={bodyData.specials}
                    specialsAnchorId="preview-specials"
                    symbol={bodyData.symbol}
                    preview
                    onOpenImage={() => {
                      /* no-op */
                    }}
                  />
                </main>
              </div>
            </div>
          </div>
        </div>

        {showBottomChromePreview && (
          <CategoryTilesPreviewChrome
            groups={bodyData.groups}
            specials={bodyData.specials}
            selected={null}
          />
        )}

        {/* Seasonal overlay stays pinned to the visible phone screen, so it
            keeps falling while the mockup content scrolls underneath. */}
        <SeasonalOverlay id={seasonalOverlayId} scope="contained" />
      </div>

      {/* Mockup frame on top - transparent screen reveals content. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mockupUrl}
        alt=""
        className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </Container>
  )
}
