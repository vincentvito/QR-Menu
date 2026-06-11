'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Sparkles, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildEnhancePrompt, buildGeneratePrompt } from '@/lib/ai/dish-image-prompts'
import { cn } from '@/lib/utils'

export type AIPhotoMode = 'enhance' | 'generate'

interface AIPhotoPanelProps {
  slug: string
  itemId: string
  mode: AIPhotoMode
  dish: { name: string; category: string; description: string }
  // Original image to show in the "before" pane. Required for enhance; null
  // for generate (there's no before).
  currentImageUrl: string | null
  onApply: (url: string) => void
  onClose: () => void
  onCreditSpent?: () => void
  canBuyCredits: boolean
  // Admins get an editable prompt textarea for diagnostics; everyone else
  // sees a read-only preview. Server enforces this independently.
  isAdmin?: boolean
}

type Status = 'setup' | 'processing' | 'review'
type ApiErrorBody = { error?: string; gate?: 'credits' | 'setup' | string }

async function buyCreditPack(fallbackError: string) {
  const res = await fetch('/api/billing/credit-pack/checkout', { method: 'POST' })
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !body.url) {
    toast.error(body.error ?? fallbackError)
    return
  }
  window.location.href = body.url
}

// Inline panel rendered below a dish row. Owns its own lifecycle + fetch; if
// the user closes it mid-call, the AbortController kills the request and the
// in-flight upload orphans in R2 (acceptable — cheap).
export function AIPhotoPanel({
  slug,
  itemId,
  mode,
  dish,
  currentImageUrl,
  onApply,
  onClose,
  onCreditSpent,
  canBuyCredits,
  isAdmin = false,
}: AIPhotoPanelProps) {
  const t = useTranslations('Editor.aiPhoto')
  const [status, setStatus] = useState<Status>('setup')
  const [extraContext, setExtraContext] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Default prompt the composer would build right now. Re-derives whenever
  // the dish or extra direction changes.
  const defaultPrompt = useMemo(() => {
    const ctx = { ...dish, extraContext: extraContext.trim() || undefined }
    return mode === 'enhance' ? buildEnhancePrompt(ctx) : buildGeneratePrompt(ctx)
  }, [dish, mode, extraContext])

  // Admin override: when non-null, the textarea is in edited state and we
  // send this exact text to the server. `null` means "use the composer".
  const [overridePrompt, setOverridePrompt] = useState<string | null>(null)
  const isOverridden = overridePrompt !== null
  const displayedPrompt = overridePrompt ?? defaultPrompt

  // Fire-and-forget cleanup of R2 orphans. Used when the owner discards a
  // generated image without applying it (Try again, Discard, or closing the
  // panel while a review is pending). Kept as-you-go so rejected attempts
  // don't pile up in storage.
  function discardResult(url: string) {
    fetch(`/api/menus/${slug}/items/${itemId}/discard-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      keepalive: true,
    }).catch(() => {
      // Best-effort — orphans accumulate in R2 but the UI doesn't care.
    })
  }

  // Cancel any in-flight fetch when the panel unmounts. Also discard any
  // review-state result the owner walked away from without keeping.
  const resultRef = useRef<string | null>(null)
  resultRef.current = resultUrl
  const statusRef = useRef<Status>(status)
  statusRef.current = status
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (statusRef.current === 'review' && resultRef.current) {
        discardResult(resultRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('processing')
    try {
      const endpoint =
        mode === 'enhance'
          ? `/api/menus/${slug}/items/${itemId}/enhance-image`
          : `/api/menus/${slug}/items/${itemId}/generate-image`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraContext: extraContext.trim() || undefined,
          // Admin-only — server ignores this for everyone else.
          overridePrompt: isAdmin && isOverridden ? overridePrompt : undefined,
        }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const body = data as ApiErrorBody
        const message =
          body.error ??
          (body.gate === 'setup' || (res.status === 402 && !canBuyCredits)
            ? t('errors.startTrialRequired')
            : t('errors.requestFailed'))
        if (res.status >= 500) {
          console.error(`[${mode}-image]`, res.status, body)
        }
        if (body.gate === 'credits' && canBuyCredits) {
          toast.error(message, {
            action: {
              label: t('buyCredits'),
              onClick: () => {
                buyCreditPack(t('errors.checkoutStartFailed')).catch((err) => {
                  toast.error(err instanceof Error ? err.message : t('errors.checkoutFailed'))
                })
              },
            },
          })
        } else if (body.gate === 'setup' || (res.status === 402 && !canBuyCredits)) {
          toast.error(message, {
            action: {
              label: t('startTrial'),
              onClick: () => {
                window.location.href = '/dashboard/billing#plan-picker'
              },
            },
          })
        } else {
          toast.error(message)
        }
        setStatus('setup')
        return
      }
      setResultUrl(data.url)
      onCreditSpent?.()
      setStatus('review')
      // Owner may have scrolled away during the 15–30s wait. Nudge them
      // back with a toast — action scrolls the dish row into view.
      const label = dish.name.trim() || t('fallbackDish')
      toast.success(t('toast.ready', { dish: label }), {
        action: {
          label: t('view'),
          onClick: () => {
            document
              .getElementById(`dish-row-${itemId}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          },
        },
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User cancelled — silent.
        setStatus('setup')
        return
      }
      toast.error(t('errors.network'))
      setStatus('setup')
    } finally {
      abortRef.current = null
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  const primaryLabel = mode === 'enhance' ? t('enhanceCta') : t('generateCta')
  const primaryIcon = mode === 'enhance' ? Wand2 : Sparkles

  return (
    <div className="border-cream-line bg-card mt-3 rounded-[16px] border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-foreground text-sm font-semibold tracking-tight">
            {mode === 'enhance' ? t('enhanceTitle') : t('generateTitle')}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {mode === 'enhance' ? t('enhanceDescription') : t('generateDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          disabled={status === 'processing'}
          className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors disabled:opacity-30"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {status === 'setup' && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`ai-context-${itemId}`}
              className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
            >
              {t('extraDirection')}
            </label>
            <Textarea
              id={`ai-context-${itemId}`}
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value.slice(0, 400))}
              placeholder={mode === 'enhance' ? t('enhancePlaceholder') : t('generatePlaceholder')}
              rows={2}
              className="text-sm"
            />
          </div>

          {isAdmin ? (
            <details className="group">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                <span className="inline-flex items-center gap-1">
                  <span className="transition-transform group-open:rotate-90">▸</span>
                  {t('masterPrompt')}
                  {isOverridden ? ` ${t('editedSuffix')}` : ''}
                </span>
              </summary>
              <p className="text-muted-foreground/80 mt-2 text-[11px] italic">
                {t('adminPromptHint')}
              </p>
              <textarea
                value={displayedPrompt}
                onChange={(e) => setOverridePrompt(e.target.value)}
                spellCheck={false}
                className="border-cream-line bg-background text-foreground mt-2 max-h-80 min-h-40 w-full resize-y overflow-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
              />
              {isOverridden ? (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverridePrompt(null)}
                  >
                    {t('resetPrompt')}
                  </Button>
                </div>
              ) : null}
            </details>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="button" size="sm" onClick={run}>
              {(() => {
                const Icon = primaryIcon
                return <Icon className="size-3.5" aria-hidden="true" />
              })()}
              {primaryLabel}
            </Button>
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="mt-3 space-y-3">
          <div className="border-cream-line bg-background flex flex-col items-center gap-3 rounded-[12px] border border-dashed px-4 py-8">
            <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden="true" />
            <p className="text-muted-foreground text-center text-xs">
              {t('processingLine1')}
              <br />
              {t('processingLine2')}
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {status === 'review' && resultUrl && (
        <div className="mt-3 space-y-3">
          <div
            className={cn(
              'grid gap-3',
              mode === 'enhance' && currentImageUrl ? 'sm:grid-cols-2' : 'grid-cols-1',
            )}
          >
            {mode === 'enhance' && currentImageUrl ? (
              <PreviewTile label={t('original')} src={currentImageUrl} />
            ) : null}
            <PreviewTile
              label={mode === 'enhance' ? t('enhanced') : t('generated')}
              src={resultUrl}
              highlight
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {mode === 'enhance' ? t('keepOriginal') : t('discard')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // Discard the current attempt before generating a new one so
                // rejected AI results don't pile up in R2.
                discardResult(resultUrl)
                setResultUrl(null)
                setStatus('setup')
              }}
            >
              {t('tryAgain')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // Clear the ref first so the unmount cleanup doesn't try to
                // discard the URL we just applied.
                resultRef.current = null
                onApply(resultUrl)
                onClose()
              }}
            >
              {mode === 'enhance' ? t('keepEnhanced') : t('useThisPhoto')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewTile({
  label,
  src,
  highlight,
}: {
  label: string
  src: string
  highlight?: boolean
}) {
  return (
    <figure
      className={cn(
        'border-cream-line bg-background overflow-hidden rounded-[12px] border',
        highlight && 'border-accent-deep',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
        className="aspect-square w-full object-cover"
      />
      <figcaption className="text-muted-foreground px-3 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
        {label}
      </figcaption>
    </figure>
  )
}
