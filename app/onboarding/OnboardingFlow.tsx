'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { addTransitionType, startTransition, useState, ViewTransition } from 'react'
import { ArrowLeft, Check, Globe2, Loader2, Palette, Sparkles, UserRound } from 'lucide-react'
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
import { LogoUploader } from '@/components/dashboard/LogoUploader'
import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/menus/currency'

type OnboardingStep = 'name' | 'url' | 'details'

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

const ONBOARDING_VISUALS: Record<
  OnboardingStep,
  {
    eyebrow: string
    title: string
    caption: string
    imageSrc: string
    imagePosition: string
  }
> = {
  name: {
    eyebrow: 'Service starts with a team',
    title: 'Invite-ready profiles before the first menu goes live.',
    caption: 'Your name appears across restaurant settings, staff actions, and owner updates.',
    imageSrc: '/images/onboarding-profile-menu.png',
    imagePosition: '50% 50%',
  },
  url: {
    eyebrow: 'Brand extraction',
    title: 'Turn a restaurant site into a polished starting point.',
    caption: 'Pull colors, logo, description, and menu context before anything is saved.',
    imageSrc: '/images/onboarding-website-extract.png',
    imagePosition: '50% 50%',
  },
  details: {
    eyebrow: 'Menu foundation',
    title: 'Confirm the identity guests will see when they scan.',
    caption: 'Logo, colors, description, and currency become the base for every QR menu.',
    imageSrc: '/images/onboarding-menu-details.png',
    imagePosition: '50% 50%',
  },
}

interface OnboardingFlowProps {
  initialUserName?: string
}

export function OnboardingFlow({ initialUserName = '' }: OnboardingFlowProps) {
  const router = useRouter()
  const hasInitialUserName = initialUserName.trim().length > 0
  const [step, setStep] = useState<OnboardingStep>(hasInitialUserName ? 'url' : 'name')
  const [url, setUrl] = useState('')
  const [userName, setUserName] = useState(initialUserName)
  const [draft, setDraft] = useState<BrandDraft>(EMPTY_DRAFT)
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function goToStep(nextStep: OnboardingStep) {
    startTransition(() => setStep(nextStep))
  }

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
      goToStep('details')
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setExtracting(false)
    }
  }

  function skipToManual() {
    setDraft(EMPTY_DRAFT)
    goToStep('details')
  }

  function continueFromName(e: React.FormEvent) {
    e.preventDefault()
    if (!userName.trim()) {
      toast.error('Please enter your name')
      return
    }
    goToStep('url')
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
      startTransition(() => {
        addTransitionType('nav-forward')
        router.push('/onboarding/start-trial')
        router.refresh()
      })
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const form =
    step === 'name' ? (
      <form
        onSubmit={continueFromName}
        className="border-cream-line bg-card/90 space-y-5 rounded-[28px] border p-6 shadow-[0_22px_60px_-42px_rgba(26,30,23,0.45)] backdrop-blur sm:p-8"
      >
        <div className="space-y-2">
          <Label htmlFor="user-name">Your name</Label>
          <Input
            id="user-name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={120}
            placeholder="How your teammates will see you"
            autoComplete="name"
            autoFocus
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={!userName.trim()}>
          <UserRound className="size-4" aria-hidden="true" />
          <span>Continue</span>
        </Button>
      </form>
    ) : step === 'url' ? (
      <form
        onSubmit={extractFromUrl}
        className="border-cream-line bg-card/90 space-y-5 rounded-[28px] border p-6 shadow-[0_22px_60px_-42px_rgba(26,30,23,0.45)] backdrop-blur sm:p-8"
      >
        {!hasInitialUserName ? (
          <button
            type="button"
            onClick={() => goToStep('name')}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            Back
          </button>
        ) : null}

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
              <span>Extracting brand...</span>
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
          Skip - I&apos;ll fill it in by hand
        </button>
      </form>
    ) : (
      <form
        onSubmit={createOrganization}
        className="border-cream-line bg-card/90 space-y-5 rounded-[28px] border p-6 shadow-[0_22px_60px_-42px_rgba(26,30,23,0.45)] backdrop-blur sm:p-8"
      >
        <button
          type="button"
          onClick={() => goToStep('url')}
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
            onChange={(nextLogo) => setDraft({ ...draft, logo: nextLogo })}
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
                  {c.symbol} - {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Creating...</span>
            </>
          ) : (
            <span>Create restaurant</span>
          )}
        </Button>
      </form>
    )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)] lg:items-start">
      <ViewTransition key={step} enter="slide-up" exit="slide-down" default="none">
        {form}
      </ViewTransition>
      <OnboardingVisual step={step} userName={userName} url={url} draft={draft} />
    </div>
  )
}

function OnboardingVisual({
  step,
  userName,
  url,
  draft,
}: {
  step: OnboardingStep
  userName: string
  url: string
  draft: BrandDraft
}) {
  const visual = ONBOARDING_VISUALS[step]
  const restaurantName = draft.name.trim() || 'Olive & Ember'
  const displayUrl = url.trim().replace(/^https?:\/\//, '') || 'restaurant.com'
  const primaryColor = /^#[0-9A-Fa-f]{6}$/.test(draft.primaryColor) ? draft.primaryColor : '#C8E06A'
  const secondaryColor = /^#[0-9A-Fa-f]{6}$/.test(draft.secondaryColor)
    ? draft.secondaryColor
    : '#E8552B'
  const checkpoints = [
    { label: 'Profile', active: step === 'name' },
    { label: 'Website', active: step === 'url' },
    { label: 'Menu', active: step === 'details' },
  ]

  return (
    <aside className="motion-safe:animate-onboarding-visual lg:sticky lg:top-24">
      <div className="border-cream-line bg-foreground text-background relative min-h-[520px] overflow-hidden rounded-[32px] border shadow-[0_28px_80px_-50px_rgba(26,30,23,0.65)]">
        <Image
          key={step}
          src={visual.imageSrc}
          alt=""
          fill
          priority={step !== 'details'}
          sizes="(max-width: 1024px) 100vw, 360px"
          className="motion-safe:animate-onboarding-image object-cover opacity-80"
          style={{ objectPosition: visual.imagePosition }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,30,23,0.24)_0%,rgba(26,30,23,0.72)_58%,rgba(26,30,23,0.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(200,224,106,0.28),transparent_28%),radial-gradient(circle_at_88%_28%,rgba(232,85,43,0.24),transparent_30%)]" />

        <div className="relative flex min-h-[520px] flex-col justify-between p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="bg-background/12 border-background/15 inline-flex rounded-full border p-1">
              {checkpoints.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    item.active ? 'bg-accent text-accent-foreground' : 'text-background/70'
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>
            <span className="bg-pop text-pop-foreground rounded-full px-3 py-1 text-[11px] font-semibold">
              Live preview
            </span>
          </div>

          <div className="space-y-4">
            <div key={`${step}-copy`} className="motion-safe:animate-onboarding-copy max-w-[330px]">
              <p className="text-accent text-xs font-semibold tracking-[0.12em] uppercase">
                {visual.eyebrow}
              </p>
              <h2 className="mt-2 text-[clamp(26px,4vw,38px)] leading-[1.04] font-semibold tracking-tight">
                {visual.title}
              </h2>
              <p className="text-background/72 mt-3 text-sm leading-6">{visual.caption}</p>
            </div>

            <div
              key={`${step}-card`}
              className="motion-safe:animate-onboarding-card border-background/18 bg-background/92 text-foreground rounded-[24px] border p-4 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.8)]"
            >
              {step === 'name' ? (
                <div className="flex items-center gap-3">
                  <div className="bg-foreground text-background grid size-12 place-items-center rounded-full">
                    <UserRound className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {userName.trim() || 'Restaurant owner'}
                    </div>
                    <div className="text-muted-foreground text-xs">Owner profile</div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
                      <Check className="text-accent-deep size-3.5" aria-hidden="true" />
                      Ready for team actions
                    </div>
                  </div>
                </div>
              ) : step === 'url' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent text-accent-foreground grid size-12 place-items-center rounded-full">
                      <Globe2 className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{displayUrl}</div>
                      <div className="text-muted-foreground text-xs">Brand source</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Logo', 'Colors', 'Copy'].map((item) => (
                      <div key={item} className="bg-card rounded-[14px] px-3 py-2 text-xs">
                        <div className="bg-foreground/15 mb-1 h-1.5 w-8 rounded-full" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{restaurantName}</div>
                      <div className="text-muted-foreground text-xs">Guest menu identity</div>
                    </div>
                    <Palette className="text-pop size-5" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2">
                    {[primaryColor, secondaryColor, '#1A1E17'].map((color) => (
                      <span
                        key={color}
                        className="border-cream-line size-7 rounded-full border"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {['Chef special', 'Seasonal main', 'Dessert'].map((item, index) => (
                      <div
                        key={item}
                        className="border-cream-line bg-background flex items-center justify-between rounded-[14px] border px-3 py-2 text-xs"
                      >
                        <span>{item}</span>
                        <span className="text-muted-foreground">{index === 0 ? '$18' : '$12'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
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
  // Native color input requires a valid hex value; keep the text field permissive.
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#FFFFFF'
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="border-cream-line size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
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
