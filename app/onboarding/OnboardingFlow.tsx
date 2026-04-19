'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
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
import { LogoUploader } from '@/components/dashboard/LogoUploader'

interface BrandDraft {
  name: string
  description: string
  logo: string
  primaryColor: string
  secondaryColor: string
  currency: CurrencyCode
  sourceUrl: string
}

const EMPTY_DRAFT: BrandDraft = {
  name: '',
  description: '',
  logo: '',
  primaryColor: '',
  secondaryColor: '',
  currency: DEFAULT_CURRENCY,
  sourceUrl: '',
}

interface OnboardingFlowProps {
  initialUserName?: string
}

export function OnboardingFlow({ initialUserName = '' }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<'url' | 'details'>('url')
  const [url, setUrl] = useState('')
  const [userName, setUserName] = useState(initialUserName)
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_DRAFT)
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function extractFromUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setExtracting(true)
    try {
      const res = await fetch('/api/onboarding/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not extract brand from that URL')
        return
      }
      setDraft({
        ...EMPTY_DRAFT,
        name: data.name ?? '',
        description: data.description ?? '',
        logo: data.logo ?? '',
        primaryColor: data.primaryColor ?? '',
        secondaryColor: data.secondaryColor ?? '',
        sourceUrl: data.url ?? url,
      })
      setStep('details')
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setExtracting(false)
    }
  }

  function skipToManual() {
    setDraft(EMPTY_DRAFT)
    setStep('details')
  }

  async function createOrganization(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, userName: userName.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not create restaurant')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'url') {
    return (
      <form
        onSubmit={extractFromUrl}
        className="border-cream-line bg-card space-y-5 rounded-2xl border p-8"
      >
        <div className="space-y-2">
          <Label htmlFor="onboarding-url">Restaurant website</Label>
          <Input
            id="onboarding-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://joespizza.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
          />
          <p className="text-muted-foreground text-xs">
            We&apos;ll pull brand details from the page. Nothing is saved yet.
          </p>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={extracting || !url.trim()}>
          {extracting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Extracting brand…</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              <span>Extract brand</span>
            </>
          )}
        </Button>

        <button
          type="button"
          onClick={skipToManual}
          className="text-muted-foreground hover:text-foreground mx-auto block text-xs transition-colors"
        >
          Skip — I&apos;ll fill it in by hand
        </button>
      </form>
    )
  }

  return (
    <form
      onSubmit={createOrganization}
      className="border-cream-line bg-card space-y-5 rounded-2xl border p-8"
    >
      <button
        type="button"
        onClick={() => setStep('url')}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        Back
      </button>

      <div className="space-y-2">
        <Label htmlFor="user-name">Your name</Label>
        <Input
          id="user-name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          maxLength={120}
          placeholder="How your teammates will see you"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-name">Restaurant name *</Label>
        <Input
          id="org-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-description">Short description</Label>
        <Textarea
          id="org-description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="Neighborhood pizzeria serving wood-fired pies since 2012."
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <LogoUploader
          value={draft.logo}
          onChange={(url) => setDraft({ ...draft, logo: url })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ColorField
          id="primary-color"
          label="Main color"
          value={draft.primaryColor}
          onChange={(v) => setDraft({ ...draft, primaryColor: v })}
        />
        <ColorField
          id="secondary-color"
          label="Accent color"
          value={draft.secondaryColor}
          onChange={(v) => setDraft({ ...draft, secondaryColor: v })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-currency">Default currency</Label>
        <Select
          value={draft.currency}
          onValueChange={(v) => setDraft({ ...draft, currency: v as CurrencyCode })}
        >
          <SelectTrigger id="org-currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.symbol} — {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Creating…</span>
          </>
        ) : (
          <span>Create restaurant</span>
        )}
      </Button>
    </form>
  )
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  // Native <input type="color"> requires a 7-char hex; fall back to white
  // for the picker when the field is empty so it doesn't render invalid.
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#FFFFFF'
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="border-cream-line size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
          aria-label={`${label} picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
    </div>
  )
}
