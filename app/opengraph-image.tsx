import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import qrcode from 'qrcode-generator'
import { SITE_NAME } from '@/lib/site'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Qtable - AI-powered digital menus and QR codes for restaurants'

const QR_URL = 'https://qtable.ai'

const colors = {
  ink: '#1A1E17',
  paper: '#F6F2E7',
  card: '#EFE8D4',
  pistachio: '#C8E06A',
  persimmon: '#E8552B',
  chip: '#FFD36B',
  muted: '#6B6B5E',
}

async function loadHeroImage() {
  const image = await readFile(join(process.cwd(), 'public/images/auth-mobile-menu-hero.png'))
  return `data:image/png;base64,${image.toString('base64')}`
}

function QtableQr({ size: qrSize }: { size: number }) {
  const qr = qrcode(0, 'M')
  qr.addData(QR_URL)
  qr.make()

  const moduleCount = qr.getModuleCount()
  const quietZone = 4
  const totalModules = moduleCount + quietZone * 2
  const cell = qrSize / totalModules

  return (
    <svg width={qrSize} height={qrSize} viewBox={`0 0 ${qrSize} ${qrSize}`}>
      <rect width={qrSize} height={qrSize} rx="22" fill={colors.paper} />
      {Array.from({ length: moduleCount }).flatMap((_, row) =>
        Array.from({ length: moduleCount }).map((__, col) =>
          qr.isDark(row, col) ? (
            <rect
              key={`${row}-${col}`}
              x={(col + quietZone) * cell}
              y={(row + quietZone) * cell}
              width={cell + 0.08}
              height={cell + 0.08}
              rx={cell * 0.16}
              fill={colors.ink}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

export default async function OpenGraphImage() {
  const heroImage = await loadHeroImage()

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: colors.paper,
        color: colors.ink,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'DM Sans, Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -92,
          top: 60,
          width: 560,
          height: 166,
          borderRadius: 90,
          background: colors.pistachio,
          transform: 'rotate(-11deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 602,
          bottom: -44,
          width: 470,
          height: 126,
          borderRadius: 80,
          background: colors.chip,
          transform: 'rotate(-7deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -90,
          top: 48,
          width: 390,
          height: 116,
          borderRadius: 80,
          background: colors.persimmon,
          transform: 'rotate(-15deg)',
        }}
      />

      <section
        style={{
          position: 'relative',
          width: 650,
          height: '100%',
          padding: '70px 0 64px 76px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 74,
              height: 74,
              borderRadius: 20,
              background: colors.ink,
              color: colors.pistachio,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 42,
              fontWeight: 900,
              letterSpacing: '-0.06em',
            }}
          >
            Q
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.035em' }}>
              {SITE_NAME}
            </div>
            <div
              style={{
                color: colors.muted,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '0.11em',
                textTransform: 'uppercase',
              }}
            >
              Restaurant QR menus
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h1
            style={{
              margin: 0,
              maxWidth: 590,
              fontSize: 80,
              lineHeight: 0.96,
              letterSpacing: '-0.058em',
              fontWeight: 900,
            }}
          >
            Your menu, one scan away.
          </h1>
          <div
            style={{
              color: colors.muted,
              fontSize: 30,
              lineHeight: 1.18,
              fontWeight: 700,
              maxWidth: 535,
            }}
          >
            AI dish photos, AI descriptions, and QR menus that update instantly.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: colors.ink,
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '-0.035em',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: colors.persimmon,
            }}
          />
          qtable.ai
        </div>
      </section>

      <section
        style={{
          position: 'relative',
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 58,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 438,
            height: 504,
            borderRadius: 42,
            overflow: 'hidden',
            background: colors.ink,
            transform: 'rotate(2deg)',
            boxShadow: '0 30px 0 rgba(0,0,0,0.22)',
            display: 'flex',
          }}
        >
          <img
            src={heroImage}
            alt=""
            width={438}
            height={504}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(26,30,23,0.06) 0%, rgba(26,30,23,0.16) 52%, rgba(26,30,23,0.62) 100%)',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            right: 34,
            bottom: 64,
            borderRadius: 32,
            background: colors.pistachio,
            padding: 14,
            display: 'flex',
            transform: 'rotate(-5deg)',
            boxShadow: '0 16px 0 rgba(0,0,0,0.18)',
          }}
        >
          <QtableQr size={166} />
        </div>
      </section>
    </div>,
    { ...size },
  )
}
