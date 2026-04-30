'use client'

import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Loader2, Plus, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { Textarea } from '@/components/ui/textarea'
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

interface EditorItem {
  id: string
  category: string
  name: string
  description: string
  price: number
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
  tags: string[]
}

export function ImportItemsPanel({
  slug,
  category,
  onCancel,
  onApplied,
}: {
  slug: string
  category: string | null
  onCancel: () => void
  onApplied: (items: EditorItem[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [items, setItems] = useState<ImportPreviewItem[]>([])
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const busy = isPreviewing || isApplying
  const FileIcon = file?.type === 'application/pdf' ? FileText : ImageIcon

  function validateAndSetFile(nextFile: File | null) {
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!ACCEPTED_IMPORT_MIME.includes(nextFile.type)) {
      setError('Upload a PDF, JPG, PNG, WEBP, HEIC, or HEIF file.')
      return
    }
    setError('')
    setFile(nextFile)
    setItems([])
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function previewImport(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!file && !text.trim()) {
      setError('Upload a file or paste menu text.')
      return
    }
    setError('')
    setIsPreviewing(true)
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      if (text.trim()) formData.append('text', text.trim())
      if (category) formData.append('category', category)
      const res = await fetch(`/api/menus/${slug}/imports`, { method: 'POST', body: formData })
      const data = (await res.json().catch(() => ({}))) as {
        items?: ImportPreviewItem[]
        error?: string
      }
      if (!res.ok || !data.items) {
        setError(data.error ?? 'Could not read that menu.')
        return
      }
      setItems(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
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
        setError(data.error ?? 'Could not add those items.')
        return
      }
      toast.success(`${data.items.length} item${data.items.length === 1 ? '' : 's'} added`)
      onApplied(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="border-cream-line bg-card rounded-[20px] border p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            {category ? `Import items into ${category}` : 'Import more menu items'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {category
              ? 'Everything extracted will be added to this category only.'
              : 'New categories can be created from the uploaded menu. Existing dishes stay untouched.'}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onCancel}
          aria-label="Close import"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <form onSubmit={previewImport} className="space-y-4">
        <div>
          {file ? (
            <div className="border-cream-line bg-background flex items-center gap-3 rounded-[14px] border p-3">
              <div className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
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
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
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
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) validateAndSetFile(dropped)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-dashed px-3 py-3 transition-colors',
                isDragging
                  ? 'border-foreground bg-background'
                  : 'border-cream-line bg-background/50 hover:border-foreground/40 hover:bg-background',
              )}
            >
              <div className="bg-card text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Upload a PDF or menu photo</div>
                <div className="text-muted-foreground truncate text-[11px]">
                  PDF, JPG, PNG, WEBP, HEIC, or HEIF
                </div>
              </div>
            </label>
          )}
          <input
            ref={fileInputRef}
            id={`category-import-file-${category ?? 'menu'}`}
            type="file"
            accept={ACCEPT_IMPORT_ATTR}
            className="sr-only"
            disabled={busy}
            onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`category-import-text-${category ?? 'menu'}`}
            className="text-muted-foreground text-xs font-semibold"
          >
            Or paste menu text
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
            placeholder="Beer&#10;Lager 7&#10;IPA 8"
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
          disabled={busy || (!file && !text.trim())}
        >
          {isPreviewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Preview items
        </Button>
      </form>

      {items.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold tracking-tight">
              {items.length} item{items.length === 1 ? '' : 's'} ready to add
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
              Add to menu
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
                    <span className="text-muted-foreground text-xs">{item.category}</span>
                  </div>
                  {item.description ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {item.price > 0 ? (
                  <span className="bg-pop text-pop-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold">
                    {formatPriceInput(item.price)}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
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

function formatPriceInput(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
