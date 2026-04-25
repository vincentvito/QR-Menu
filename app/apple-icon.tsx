import { ImageResponse } from 'next/og'

// iOS home-screen icon — 180×180, matches the favicon's look at a larger
// size so the Q stays centered and readable when users save Qtable to their
// home screen.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
        fontSize: 128,
        lineHeight: 1,
      }}
    >
      Q
    </div>,
    { ...size },
  )
}
