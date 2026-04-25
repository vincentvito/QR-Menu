import { ImageResponse } from 'next/og'

// Default social-share image used when someone links to the landing, blog,
// or any route without its own opengraph-image.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Qtable — Beautiful digital menus for restaurants'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F6F2E7',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px 96px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Accent blobs — echo the brand's landing hero without shipping a photo */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 480,
          height: 480,
          borderRadius: 9999,
          background: '#C8E06A',
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 420,
          height: 420,
          borderRadius: 9999,
          background: '#E8552B',
          opacity: 0.25,
        }}
      />

      {/* Top row — brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 20,
            background: '#1A1E17',
            color: '#C8E06A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'serif',
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1,
          }}
        >
          Q
        </div>
        <span
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#1A1E17',
            letterSpacing: '-0.02em',
          }}
        >
          Qtable
        </span>
      </div>

      {/* Pitch */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: '#1A1E17',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            maxWidth: 960,
          }}
        >
          Turn your printed menu into a QR code in seconds.
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#6B6B5E',
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Beautiful mobile pages, instant edits, WiFi + specials + dish photos — one link for every
          table.
        </div>
      </div>
    </div>,
    { ...size },
  )
}
