'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageLightbox } from '@/components/menu/ImageLightbox'
import { cn } from '@/lib/utils'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 5 * 1024 * 1024

interface DishPhotoUploaderProps {
  itemId: string
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

// Per-dish photo slot. Square thumbnail; drag-drop or click-to-browse. On
// successful upload, bubbles the R2 URL up to ItemRow which PATCHes the
// dish's imageUrl via the existing saveItem flow.
export function DishPhotoUploader({
  itemId,
  value,
  onChange,
  disabled = false,
}: DishPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Pick a PNG, JPG, or WEBP file')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Photo must be under 5 MB')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('itemId', itemId)
      const res = await fetch('/api/upload/menu-item-image', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
        return
      }
      onChange(data.url)
    } catch {
      toast.error('Network error - please try again')
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

  if (value) {
    return (
      <>
        <div className="border-cream-line bg-background relative size-20 shrink-0 overflow-hidden rounded-lg border">
          <button
            type="button"
            aria-label="Open dish photo"
            onClick={() => setPreviewSrc(value)}
            className="focus-visible:ring-ring block h-full w-full cursor-zoom-in focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {/* Raw <img>: planned to swap in a Cloudflare Images transform layer later;
                next/image optimizer isn't wired for this surface. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={() => onChange(null)}
            />
          </button>
          <button
            type="button"
            aria-label="Remove photo"
            disabled={busy}
            onClick={() => onChange(null)}
            className="bg-foreground/70 text-background hover:bg-foreground absolute top-1 right-1 grid size-5 place-items-center rounded-full backdrop-blur-sm transition-opacity disabled:opacity-50"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </div>
        <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />
      </>
    )
  }

  return (
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
        'border-cream-line bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[10px] font-medium transition-colors',
        dragging && 'border-foreground text-foreground',
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
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <>
          <ImagePlus className="size-5" aria-hidden="true" />
          <span>Photo</span>
        </>
      )}
    </label>
  )
}
