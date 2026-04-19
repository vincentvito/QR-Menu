'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/svg+xml'

interface LogoUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  /** `settings` uses the authenticated upload endpoint; `onboarding` too. */
  endpoint?: string
}

// Drop-zone + "Choose file" uploader. Falls back to typing a URL directly.
// On upload success, writes the R2 URL into the bound form field.
export function LogoUploader({
  value,
  onChange,
  disabled = false,
  endpoint = '/api/upload/logo',
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Pick a PNG, JPG, WEBP, or SVG file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
        return
      }
      onChange(data.url)
      toast.success('Logo uploaded')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) uploadFile(file)
  }

  const busy = uploading || disabled

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {value ? (
          <div className="border-cream-line bg-background relative size-14 shrink-0 overflow-hidden rounded-lg border">
            <Image
              src={value}
              alt=""
              fill
              unoptimized
              className="object-contain"
              onError={() => onChange('')}
            />
            <button
              type="button"
              aria-label="Remove logo"
              onClick={() => onChange('')}
              disabled={busy}
              className="absolute top-0.5 right-0.5 bg-foreground/80 text-background flex size-4 items-center justify-center rounded-full hover:bg-foreground"
            >
              <X className="size-2.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="border-cream-line bg-background text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed">
            <Upload className="size-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (!busy) handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              'border-cream-line hover:border-foreground/40 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 text-center text-xs transition-colors',
              dragging && 'border-foreground bg-background',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <span className="text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Uploading…
              </span>
            ) : (
              <span>
                <span className="text-foreground font-medium">Drop a logo</span>{' '}
                <span className="text-muted-foreground">or click to browse · PNG, JPG, WEBP, SVG up to 2 MB</span>
              </span>
            )}
          </label>
        </div>
      </div>

      <details className="text-muted-foreground text-xs">
        <summary className="hover:text-foreground cursor-pointer select-none">
          …or paste a URL instead
        </summary>
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          placeholder="https://…"
          className="mt-2"
        />
      </details>
    </div>
  )
}
