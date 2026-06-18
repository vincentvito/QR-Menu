'use client'

import { useRouter } from 'next/navigation'
import { addTransitionType, useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Image as ImageIcon, LinkIcon, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const ACCEPTED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const ACCEPT_ATTR = ACCEPTED_MIME.join(',')
const MAX_FILES = 3

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function NewMenuForm() {
  const t = useTranslations('Dashboard.newMenu')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const busy = isLoading || isPending
  const hasSource = files.length > 0 || url.trim().length > 0 || text.trim().length > 0

  function sameFile(a: File, b: File) {
    return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
  }

  function validateAndSetFiles(nextFiles: File[]) {
    // Re-selecting the same file must fire onChange again, and a drop with no
    // files (e.g. dragged text) must not wipe the current selection.
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (nextFiles.length === 0) return
    const mergedFiles = [...files]
    for (const file of nextFiles) {
      if (!mergedFiles.some((existing) => sameFile(existing, file))) {
        mergedFiles.push(file)
      }
    }
    if (mergedFiles.length > MAX_FILES) {
      setError(t('errors.tooManyFiles', { limit: MAX_FILES }))
      return
    }
    if (mergedFiles.some((file) => !ACCEPTED_MIME.includes(file.type))) {
      setError(t('errors.badType'))
      return
    }
    setError('')
    setFiles(mergedFiles)
  }

  function clearFiles() {
    setFiles([])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (files.length === 0 && !url.trim() && !text.trim()) {
      setError(t('errors.empty'))
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const formData = new FormData()
      for (const file of files) formData.append('file', file)
      if (url.trim()) formData.append('url', url.trim())
      if (text.trim()) formData.append('text', text.trim())
      if (name.trim()) formData.append('name', name.trim())

      const res = await fetch('/api/menus', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t('errors.generic'))
        setIsLoading(false)
        return
      }
      // Route straight to the editor so the owner can review/tweak items
      // before sharing. The public menu is one click away via "View public".
      startTransition(() => {
        addTransitionType('nav-forward')
        router.push(`/dashboard/menus/${data.slug}/edit`)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.network'))
      setIsLoading(false)
    }
  }

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
        <div className="border-cream-line bg-background/60 rounded-[16px] border p-4">
          <h3 className="text-sm font-semibold">{t('chooseSourceTitle')}</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {t('chooseSourceDescription')}
          </p>
        </div>

        {/* File drop zone */}
        <div
          className={`rounded-[18px] border p-4 transition-colors ${
            files.length > 0 ? 'border-accent bg-accent/10' : 'border-cream-line bg-background/35'
          }`}
        >
          <div className="mb-3 flex items-start gap-2">
            <span
              aria-hidden="true"
              className="bg-foreground text-background mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
            >
              A
            </span>
            <div>
              <Label htmlFor="menu-file">{t('fileLabel')}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">{t('fileOptionHint')}</p>
            </div>
          </div>

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
              validateAndSetFiles(Array.from(e.dataTransfer.files ?? []))
            }}
            className={`block cursor-pointer rounded-[14px] border-2 border-dashed px-3 py-3 transition-colors ${
              isDragging
                ? 'border-foreground bg-background'
                : 'border-cream-line bg-background/50 hover:border-foreground/40 hover:bg-background'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-card text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t('fileDrop')}</div>
                <div className="text-muted-foreground truncate text-[11px]">{t('fileHint')}</div>
              </div>
            </div>

            {files.length > 0 ? (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => {
                  const FileIcon = file.type === 'application/pdf' ? FileText : ImageIcon

                  return (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="border-cream-line bg-card flex items-center gap-2 rounded-[10px] border px-2.5 py-2"
                    >
                      <FileIcon
                        className="text-muted-foreground h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{file.name}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {formatBytes(file.size)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          removeFile(index)
                        }}
                        disabled={busy}
                        aria-label={t('fileClear')}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    clearFiles()
                  }}
                  disabled={busy}
                  className="h-8 px-2"
                >
                  {t('filesClear')}
                </Button>
              </div>
            ) : null}
          </label>

          <input
            ref={fileInputRef}
            id="menu-file"
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="sr-only"
            disabled={busy}
            onChange={(e) => validateAndSetFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        <Divider label={t('orDivider')} />

        <div
          className={`rounded-[18px] border p-4 transition-colors ${
            url.trim() ? 'border-accent bg-accent/10' : 'border-cream-line bg-background/35'
          }`}
        >
          <div className="mb-3 flex items-start gap-2">
            <span
              aria-hidden="true"
              className="bg-foreground text-background mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
            >
              B
            </span>
            <div>
              <Label htmlFor="menu-url">{t('urlLabel')}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">{t('urlOptionHint')}</p>
            </div>
          </div>
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

        <div
          className={`rounded-[18px] border p-4 transition-colors ${
            text.trim() ? 'border-accent bg-accent/10' : 'border-cream-line bg-background/35'
          }`}
        >
          <div className="mb-3 flex items-start gap-2">
            <span
              aria-hidden="true"
              className="bg-foreground text-background mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
            >
              C
            </span>
            <div>
              <Label htmlFor="menu-text">{t('textLabel')}</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">{t('textOptionHint')}</p>
            </div>
          </div>
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

        <div className="border-cream-line bg-background/35 rounded-[18px] border p-4">
          <Label htmlFor="menu-name">{t('nameLabel')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">{t('nameHint')}</p>
          <Input
            id="menu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder={t('namePlaceholder')}
            className="mt-3"
          />
        </div>

        {error && (
          <p role="alert" aria-live="polite" className="text-destructive text-sm">
            {error}
          </p>
        )}

        {!hasSource && !error ? (
          <p id="source-required-hint" className="text-muted-foreground text-center text-xs">
            {t('sourceRequired')}
          </p>
        ) : null}

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={busy || !hasSource}
          aria-describedby={!hasSource && !error ? 'source-required-hint' : undefined}
          className="w-full disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </PillButton>
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
