'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 20 * 1024 * 1024
const ENDPOINT = '/api/upload/header'

interface HeaderImageUploaderProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
}

// Landscape drop zone + preview for the public-menu header banner. Unlike
// the small square LogoUploader, this occupies a 16:9 area so the owner
// actually sees what their image will look like behind the restaurant name.
export function HeaderImageUploader({
  value,
  onChange,
  disabled = false,
}: HeaderImageUploaderProps) {
  const t = useTranslations('Settings.upload.headerImage')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error(t('errors.badType'))
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('errors.tooLarge'))
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(ENDPOINT, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('errors.uploadFailed'))
        return
      }
      onChange(data.url)
      toast.success(t('toast.uploaded'))
    } catch {
      toast.error(t('errors.network'))
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
          // Compact landscape strip — big enough to read the image but
          // doesn't dominate the Settings form. Closer to the actual
          // public-menu header proportions (wide, thin) than a full 16:9
          // preview would be.
          'border-cream-line focus-within:border-foreground focus-within:ring-foreground/20 relative block h-32 w-full cursor-pointer overflow-hidden rounded-[14px] border-2 border-dashed transition-colors focus-within:ring-2 sm:h-40',
          value ? 'border-solid' : 'hover:border-foreground/40',
          dragging && 'border-foreground bg-background',
          busy && 'pointer-events-none opacity-60',
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

        {value ? (
          <>
            {/* Raw <img> so it works uniformly; Cloudflare Image transforms
                can slot in here later without touching upload logic. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={() => onChange('')}
            />
            {/* Hover affordance: scrim + copy signals the whole tile is a
                drop target even when filled. */}
            <div className="bg-foreground/60 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
              <span className="text-background inline-flex items-center gap-2 text-sm font-semibold">
                <Upload className="size-4" aria-hidden="true" />
                {t('replace')}
              </span>
            </div>
          </>
        ) : (
          <div className="bg-background/60 flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            {uploading ? (
              <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t('uploading')}
              </span>
            ) : (
              <>
                <div className="bg-card text-muted-foreground flex size-11 items-center justify-center rounded-full">
                  <Upload className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-foreground text-sm font-medium">{t('drop')}</div>
                  <div className="text-muted-foreground text-xs">{t('browseHint')}</div>
                </div>
              </>
            )}
          </div>
        )}
      </label>

      {value && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="text-destructive hover:text-destructive hover:bg-destructive/5 ml-auto flex"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t('remove')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('dialog.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="outline"
                onClick={() => onChange('')}
                className="text-destructive hover:text-destructive hover:bg-destructive/5"
              >
                {t('remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
