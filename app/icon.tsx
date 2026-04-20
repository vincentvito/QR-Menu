import { ImageResponse } from 'next/og'

// Small brand favicon — ink rounded square with a pistachio "Q". Rendered
// at build time by Next so it ships as a static PNG and matches the brand
// palette without shipping a .ico file.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A1E17',
        borderRadius: '22%',
        color: '#C8E06A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'serif',
        fontWeight: 700,
        fontSize: 24,
        lineHeight: 1,
      }}
    >
      Q
    </div>,
    { ...size },
  )
}
