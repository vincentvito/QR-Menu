'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText,
  Image as ImageIcon,
  LinkIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/menus/currency'

const ACCEPTED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const ACCEPT_ATTR = ACCEPTED_MIME.join(',')
// Matches the server — Gemini inline data caps at ~20 MB per request.
const MAX_FILE_BYTES = 20 * 1024 * 1024

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function NewMenuForm() {
  const t = useTranslations('Dashboard.newMenu')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const busy = isLoading || isPending

  function validateAndSetFile(f: File | null) {
    if (!f) {
      setFile(null)
      return
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError(t('errors.badType'))
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(t('errors.tooLarge'))
      return
    }
    setError('')
    setFile(f)
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!file && !url.trim() && !text.trim()) {
      setError(t('errors.empty'))
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      if (url.trim()) formData.append('url', url.trim())
      if (text.trim()) formData.append('text', text.trim())
      if (restaurantName.trim()) formData.append('restaurantName', restaurantName.trim())
      formData.append('currency', currency)

      const res = await fetch('/api/menus', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setIsLoading(false)
        return
      }
      startTransition(() => router.push(`/m/${data.slug}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setIsLoading(false)
    }
  }

  const FileIcon = file?.type === 'application/pdf' ? FileText : ImageIcon

  return (
    <div className="border-cream-line bg-card rounded-[24px] border p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="bg-accent text-accent-foreground mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{t('title')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File drop zone */}
        <div className="space-y-2">
          <Label htmlFor="menu-file">{t('fileLabel')}</Label>

          {file ? (
            <div className="border-cream-line bg-background flex items-center gap-3 rounded-[14px] border p-3">
              <div className="bg-accent text-accent-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                <FileIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-muted-foreground text-xs">{formatBytes(file.size)}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearFile}
                disabled={busy}
                aria-label={t('fileClear')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="menu-file"
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) validateAndSetFile(dropped)
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed px-3 py-3 transition-colors ${
                isDragging
                  ? 'border-foreground bg-background'
                  : 'border-cream-line bg-background/50 hover:border-foreground/40 hover:bg-background'
              }`}
            >
              <div className="bg-card text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t('fileDrop')}</div>
                <div className="text-muted-foreground truncate text-[11px]">
                  {t('fileHint')}
                </div>
              </div>
            </label>
          )}

          <input
            ref={fileInputRef}
            id="menu-file"
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            disabled={busy}
            onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <Divider label={t('orDivider')} />

        <div className="space-y-2">
          <Label htmlFor="menu-url">{t('urlLabel')}</Label>
          <div className="relative">
            <LinkIcon
              className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="menu-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder={t('urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              className="pl-9"
            />
          </div>
          <p className="text-muted-foreground text-xs">{t('urlHint')}</p>
        </div>

        <Divider label={t('orDivider')} />

        <div className="space-y-2">
          <Label htmlFor="menu-text">{t('textLabel')}</Label>
          <Textarea
            id="menu-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            rows={6}
            placeholder={t('textPlaceholder')}
            className="min-h-[140px]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <Label htmlFor="menu-name">{t('nameLabel')}</Label>
            <Input
              id="menu-name"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              disabled={busy}
              placeholder={t('namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-currency">{t('currencyLabel')}</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as CurrencyCode)}
              disabled={busy}
            >
              <SelectTrigger id="menu-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="pillPrimary"
          size="pill-lg"
          disabled={busy}
          className="w-full"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </form>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="bg-cream-line h-px flex-1" />
      <span className="text-muted-foreground tracking-[0.14em] uppercase">{label}</span>
      <span className="bg-cream-line h-px flex-1" />
    </div>
  )
}
