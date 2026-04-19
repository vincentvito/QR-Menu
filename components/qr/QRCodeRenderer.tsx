'use client'

import { useEffect, useMemo, useRef } from 'react'
import type QRCodeStylingType from 'qr-code-styling'

export type QRDotStyle =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'classy'
  | 'classy-rounded'
  | 'extra-rounded'

export type QRCornerStyle = 'square' | 'dot' | 'extra-rounded'

export type QRCenterType = 'none' | 'logo' | 'text'

export interface QRCodeRendererProps {
  data: string
  size?: number
  dotStyle?: QRDotStyle
  cornerStyle?: QRCornerStyle
  foregroundColor?: string
  backgroundColor?: string
  centerType?: QRCenterType
  centerText?: string | null
  logo?: string | null
  className?: string
  onReady?: (qr: QRCodeStylingType) => void
}

// Build a tiny inline SVG data URL containing the user's text. Used as the
// `image` payload for qr-code-styling when centerType is "text", so the text
// participates in SVG/PNG exports just like a real logo would.
function textToDataUrl(text: string, fg: string, bg: string): string {
  // Heuristic font sizing so 1–4 chars all fit the 100×100 viewport.
  const len = [...text].length || 1
  const fontSize = len <= 1 ? 58 : len === 2 ? 46 : len === 3 ? 36 : 28
  const safe = text.replace(/[<>&"']/g, (c) =>
    c === '<'
      ? '&lt;'
      : c === '>'
        ? '&gt;'
        : c === '&'
          ? '&amp;'
          : c === '"'
            ? '&quot;'
            : '&apos;',
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="${bg}"/><text x="50" y="50" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="${fontSize}" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="central">${safe}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// Renders a customizable QR into a DOM node via qr-code-styling. The library
// is client-only (uses canvas/DOM), so the component is marked 'use client'
// and dynamically imported to keep it out of the SSR bundle.
export function QRCodeRenderer({
  data,
  size = 260,
  dotStyle = 'square',
  cornerStyle = 'square',
  foregroundColor = '#1C1917',
  backgroundColor = '#FDFCFB',
  centerType = 'none',
  centerText = null,
  logo,
  className,
  onReady,
}: QRCodeRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const qrRef = useRef<QRCodeStylingType | null>(null)

  // Resolve what goes in the middle. Text mode wins over logo; `none` forces
  // a plain QR even when org.logo is set (higher scan reliability).
  const centerImage = useMemo(() => {
    if (centerType === 'text' && centerText?.trim()) {
      return textToDataUrl(centerText.trim(), foregroundColor, backgroundColor)
    }
    if (centerType === 'logo' && logo) return logo
    return undefined
  }, [centerType, centerText, logo, foregroundColor, backgroundColor])

  // Memoize the option payload so effects only react to real changes.
  const options = useMemo(
    () => ({
      width: size,
      height: size,
      type: 'svg' as const,
      data,
      image: centerImage,
      margin: 0,
      qrOptions: { errorCorrectionLevel: 'H' as const },
      dotsOptions: { color: foregroundColor, type: dotStyle },
      backgroundOptions: { color: backgroundColor },
      cornersSquareOptions: { color: foregroundColor, type: cornerStyle },
      cornersDotOptions: { color: foregroundColor, type: cornerStyle },
      imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.32 },
    }),
    [data, size, dotStyle, cornerStyle, foregroundColor, backgroundColor, centerImage],
  )

  // Stash onReady in a ref so a new inline callback from the parent (which
  // happens on every render) doesn't re-trigger the effect. We only want
  // the effect to run when the actual QR options change.
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    let cancelled = false

    async function mount() {
      // Dynamic import: the library pulls in canvas code that can't run during
      // React Server Component SSR. Keeping it async also keeps ~50KB off the
      // initial bundle for pages that don't use QR codes.
      const { default: QRCodeStyling } = await import('qr-code-styling')
      if (cancelled || !containerRef.current) return

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling(options)
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      } else {
        qrRef.current.update(options)
      }
      onReadyRef.current?.(qrRef.current)
    }

    mount()
    return () => {
      cancelled = true
    }
  }, [options])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
      aria-label="QR code preview"
    />
  )
}

// Helpers for download. Accept the instance from `onReady`.
export function downloadQR(qr: QRCodeStylingType, filename: string, ext: 'svg' | 'png') {
  qr.download({ name: filename, extension: ext })
}
