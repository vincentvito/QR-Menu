import { ImageResponse } from 'next/og'
import { getMenuBySlug } from '@/lib/menus/get'
import { getTheme } from '@/lib/menus/themes'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Restaurant menu'
// Cache the rendered PNG for an hour. Link-preview scrapers hammer the
// same URL repeatedly; regenerating the same image from Prisma + Satori
// on every hit is expensive and pointless when menu data hasn't changed.
export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

// Per-menu share card. Uses the restaurant's brand colors (with theme
// fallback) so share previews feel like that specific restaurant, not a
// generic QRmenucrafter card.
export default async function MenuOpenGraphImage({ params }: Props) {
  const { slug } = await params
  const menu = await getMenuBySlug(slug)

  // Fall back to the generic landing image when the slug is unknown.
  if (!menu) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F6F2E7',
            color: '#1A1E17',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            fontFamily: 'sans-serif',
            fontWeight: 700,
          }}
        >
          Menu not found
        </div>
      ),
      { ...size },
    )
  }

  const org = menu.organization
  const theme = getTheme(org.theme)
  const background = theme.colors.background
  const foreground = theme.colors.foreground
  const accent = org.primaryColor || theme.colors.accent
  const pop = org.secondaryColor || theme.colors.pop
  const muted = theme.colors.mutedForeground
  const itemCount = menu.items.length

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background,
          color: foreground,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px 96px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Accent blobs colored by the org's brand */}
        <div
          style={{
            position: 'absolute',
            top: -140,
            right: -100,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: accent,
            opacity: 0.25,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: pop,
            opacity: 0.22,
          }}
        />

        {/* Eyebrow: menu name */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: pop,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
          }}
        >
          {menu.name}
        </div>

        {/* Restaurant name — hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 128,
              fontWeight: 700,
              color: foreground,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
              maxWidth: 980,
            }}
          >
            {org.name}
          </div>
          {org.description ? (
            <div
              style={{
                fontSize: 32,
                color: muted,
                maxWidth: 900,
                lineHeight: 1.3,
              }}
            >
              {org.description.slice(0, 140)}
            </div>
          ) : null}
        </div>

        {/* Footer row: dish count + QRmenucrafter wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 24,
              color: muted,
            }}
          >
            <span
              style={{
                background: foreground,
                color: background,
                borderRadius: 9999,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 22,
              color: muted,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: foreground,
                color: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'serif',
                fontWeight: 700,
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              Q
            </div>
            <span style={{ fontWeight: 600 }}>QRmenucrafter</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
