'use client'

import { useRef, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import type QRCodeStylingType from 'qr-code-styling'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  QRCodeRenderer,
  downloadQR,
  type QRCenterType,
  type QRCornerStyle,
  type QRDotStyle,
} from '@/components/qr/QRCodeRenderer'

interface MenuQRPanelProps {
  menuName: string
  publicUrl: string
  qr: {
    dotStyle: string
    cornerStyle: string
    foregroundColor: string
    backgroundColor: string
    centerType: string
    centerText: string | null
    logo: string | null
  }
}

// Slug-safe filename: strip anything that isn't alphanum/dash/underscore.
function toFileStem(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'menu'
  )
}

export function MenuQRPanel({ menuName, publicUrl, qr }: MenuQRPanelProps) {
  const qrRef = useRef<QRCodeStylingType | null>(null)
  const [copied, setCopied] = useState(false)

  function handleReady(instance: QRCodeStylingType) {
    qrRef.current = instance
  }

  function handleDownload(ext: 'svg' | 'png') {
    if (!qrRef.current) {
      toast.error('QR code is not ready yet — try again in a moment')
      return
    }
    downloadQR(qrRef.current, `${toFileStem(menuName)}-qr`, ext)
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy URL')
    }
  }

  return (
    <div className="border-cream-line bg-card rounded-2xl border p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <div
            className="border-cream-line overflow-hidden rounded-xl border p-4"
            style={{ backgroundColor: qr.backgroundColor }}
          >
            <QRCodeRenderer
              data={publicUrl}
              size={260}
              dotStyle={qr.dotStyle as QRDotStyle}
              cornerStyle={qr.cornerStyle as QRCornerStyle}
              foregroundColor={qr.foregroundColor}
              backgroundColor={qr.backgroundColor}
              centerType={qr.centerType as QRCenterType}
              centerText={qr.centerText}
              logo={qr.logo}
              onReady={handleReady}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Menu URL
            </p>
            <div className="bg-background border-cream-line flex items-center gap-2 rounded-lg border px-3 py-2">
              <code className="truncate text-xs">{publicUrl}</code>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={copyUrl}
                aria-label="Copy menu URL"
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            {copied && (
              <p className="text-muted-foreground text-xs">Copied to clipboard</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Download
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => handleDownload('svg')}>
                <Download className="size-4" aria-hidden="true" />
                SVG
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload('png')}
              >
                <Download className="size-4" aria-hidden="true" />
                PNG
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              SVG scales to any size without loss — best for printing. PNG is
              handy for sending in chat or email.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
