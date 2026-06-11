'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VariantPriceChips } from '@/components/menu/VariantPriceChips'
import { formatMenuPrice } from '@/lib/menus/price-format'
import { cn } from '@/lib/utils'

const ACCEPTED_IMPORT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const ACCEPT_IMPORT_ATTR = ACCEPTED_IMPORT_MIME.join(',')
const MAX_IMPORT_FILES = 3

interface EditorItem {
  id: string
  category: string
  name: string
  description: string
  price: number
  variants: { label: string; price: number }[]
  tags: string[]
  badges: string[]
  specialUntil: string | null
  imageUrl: string | null
}

interface ImportPreviewItem {
  name: string
  category: string
  description: string
  price: number
  // Size/price variants from extraction — passed through untouched so the
  // persist call keeps them.
  variants: { label: string; price: number }[]
  tags: string[]
}

export function ImportItemsPanel({
  slug,
  category,
  categoryNames,
  symbol,
  onCancel,
  onApplied,
}: {
  slug: string
  category: string | null
  categoryNames: string[]
  symbol: string
  onCancel: () => void
  onApplied: (items: EditorItem[]) => void
}) {
  const t = useTranslations('Editor.import')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [items, setItems] = useState<ImportPreviewItem[]>([])
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const busy = isPreviewing || isApplying
  const previewCategoryNames = useMemo(() => {
    const names = new Set(categoryNames)
    for (const item of items) {
      const trimmed = item.category.trim()
      if (trimmed) names.add(trimmed)
    }
    return Array.from(names)
  }, [categoryNames, items])

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
    if (mergedFiles.length > MAX_IMPORT_FILES) {
      setError(t('errors.tooManyFiles', { limit: MAX_IMPORT_FILES }))
      return
    }
    if (mergedFiles.some((file) => !ACCEPTED_IMPORT_MIME.includes(file.type))) {
      setError(t('errors.badType'))
      return
    }
    setError('')
    setFiles(mergedFiles)
    setItems([])
  }

  function clearFiles() {
    setFiles([])
    setItems([])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
    setItems([])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function previewImport(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (files.length === 0 && !text.trim()) {
      setError(t('errors.empty'))
      return
    }
    setError('')
    setIsPreviewing(true)
    try {
      const formData = new FormData()
      for (const file of files) formData.append('file', file)
      if (text.trim()) formData.append('text', text.trim())
      if (category) formData.append('category', category)
      const res = await fetch(`/api/menus/${slug}/imports`, { method: 'POST', body: formData })
      const data = (await res.json().catch(() => ({}))) as {
        items?: ImportPreviewItem[]
        error?: string
      }
      if (!res.ok || !data.items) {
        setError(data.error ?? t('errors.readFailed'))
        return
      }
      setItems(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.importFailed'))
    } finally {
      setIsPreviewing(false)
    }
  }

  async function applyImport() {
    if (busy || items.length === 0) return
    setError('')
    setIsApplying(true)
    try {
      const res = await fetch(`/api/menus/${slug}/imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        items?: EditorItem[]
        error?: string
      }
      if (!res.ok || !data.items) {
        setError(data.error ?? t('errors.addFailed'))
        return
      }
      toast.success(t('toast.added', { count: data.items.length }))
      onApplied(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.importFailed'))
    } finally {
      setIsApplying(false)
    }
  }

  function updateItemCategory(index: number, nextCategory: string) {
    setItems((cur) =>
      cur.map((item, i) => (i === index ? { ...item, category: nextCategory } : item)),
    )
  }

  return (
    <div className="border-cream-line bg-card rounded-[20px] border p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            {category ? t('titleForCategory', { category }) : t('title')}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {category ? t('descriptionForCategory') : t('description')}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onCancel}
          aria-label={t('close')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <form onSubmit={previewImport} className="space-y-4">
        <div>
          <label
            htmlFor={`category-import-file-${category ?? 'menu'}`}
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
            className={cn(
              'block cursor-pointer rounded-[14px] border-2 border-dashed px-3 py-3 transition-colors',
              isDragging
                ? 'border-foreground bg-background'
                : 'border-cream-line bg-background/50 hover:border-foreground/40 hover:bg-background',
            )}
          >
            <div className="flex items-center gap-3">
              <div className="bg-card text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t('uploadLabel')}</div>
                <div className="text-muted-foreground truncate text-[11px]">{t('uploadHint')}</div>
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
                        aria-label={t('removeFile', { file: file.name })}
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
                  {t('clearFiles')}
                </Button>
              </div>
            ) : null}
          </label>
          <input
            ref={fileInputRef}
            id={`category-import-file-${category ?? 'menu'}`}
            type="file"
            multiple
            accept={ACCEPT_IMPORT_ATTR}
            className="sr-only"
            disabled={busy}
            onChange={(e) => validateAndSetFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`category-import-text-${category ?? 'menu'}`}
            className="text-muted-foreground text-xs font-semibold"
          >
            {t('pasteLabel')}
          </label>
          <Textarea
            id={`category-import-text-${category ?? 'menu'}`}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setItems([])
            }}
            disabled={busy}
            rows={4}
            placeholder={t('pastePlaceholder')}
            className="min-h-[100px]"
          />
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={busy || (files.length === 0 && !text.trim())}
        >
          {isPreviewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {t('preview')}
        </Button>
      </form>

      {items.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold tracking-tight">
              {t('itemsReady', { count: items.length })}
            </h4>
            <PillButton
              type="button"
              size="sm"
              variant="primary"
              onClick={applyImport}
              disabled={busy}
            >
              {isApplying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {t('addToMenu')}
            </PillButton>
          </div>
          <ul className="border-cream-line max-h-[320px] overflow-auto rounded-[14px] border">
            {items.map((item, index) => (
              <li
                key={`${item.category}-${item.name}-${index}`}
                className="border-cream-line bg-background flex items-start gap-3 border-b px-3 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-semibold tracking-[-0.01em]">{item.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          className="h-7 max-w-[180px] rounded-full px-2 text-xs"
                          aria-label={t('changeCategory', { item: item.name })}
                        >
                          <span className="truncate">{item.category}</span>
                          <ChevronDown data-icon="inline-end" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="max-h-[280px] w-56 overflow-y-auto"
                      >
                        <DropdownMenuLabel>{t('moveToCategory')}</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={item.category}
                          onValueChange={(nextCategory) => updateItemCategory(index, nextCategory)}
                        >
                          {previewCategoryNames.map((name) => (
                            <DropdownMenuRadioItem key={name} value={name}>
                              {name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {item.description ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {item.description}
                    </p>
                  ) : null}
                  {item.variants.length > 0 ? (
                    <VariantPriceChips
                      symbol={symbol}
                      variants={item.variants}
                      size="sm"
                      className="mt-2"
                    />
                  ) : null}
                </div>
                {item.price > 0 && item.variants.length === 0 ? (
                  <span className="bg-pop text-pop-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
                    {symbol}
                    {formatMenuPrice(symbol, item.price)}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={t('removeItem', { item: item.name })}
                  onClick={() => setItems((cur) => cur.filter((_, i) => i !== index))}
                  className="text-muted-foreground hover:text-destructive grid size-7 shrink-0 place-items-center rounded-full transition-colors"
                  disabled={busy}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
