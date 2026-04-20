'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type QRCodeStylingType from 'qr-code-styling'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LogoUploader } from '@/components/dashboard/LogoUploader'
import { HeaderImageUploader } from '@/components/dashboard/HeaderImageUploader'
import { SectionHeading } from '@/components/ui/section-heading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CURRENCIES, type CurrencyCode } from '@/lib/menus/currency'
import {
  QRCodeRenderer,
  downloadQR,
  type QRCenterType,
  type QRCornerStyle,
  type QRDotStyle,
} from '@/components/qr/QRCodeRenderer'
import { buildWifiUri, WIFI_ENCRYPTIONS, type WifiEncryption } from '@/lib/wifi'
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from '@/components/menu/templates'
import {
  TemplatePreview,
  type TemplatePreviewRealData,
} from '@/components/menu/templates/TemplatePreview'
import { THEMES, DEFAULT_THEME_ID } from '@/lib/menus/themes'
import { SEASONAL_OVERLAYS, DEFAULT_SEASONAL_OVERLAY_ID } from '@/lib/menus/seasonal-overlays'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const QR_DOT_STYLES: { value: QRDotStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy rounded' },
  { value: 'extra-rounded', label: 'Extra rounded' },
]

const QR_CORNER_STYLES: { value: QRCornerStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
  { value: 'extra-rounded', label: 'Extra rounded' },
]

const VALID_CENTER_TYPES: QRCenterType[] = ['none', 'logo', 'text']
function normalizeCenterType(value: string): QRCenterType {
  return VALID_CENTER_TYPES.includes(value as QRCenterType) ? (value as QRCenterType) : 'none'
}

const RESTAURANT_FIELDS = ['name', 'description', 'sourceUrl', 'currency'] as const
const LINKS_FIELDS = ['googleReviewUrl', 'instagramUrl', 'tiktokUrl', 'facebookUrl'] as const
const MENU_DESIGN_FIELDS = ['templateId', 'theme', 'seasonalOverlay', 'headerTextColor'] as const
const BRAND_FIELDS = ['logo', 'headerImage', 'primaryColor', 'secondaryColor'] as const
const QR_FIELDS = [
  'qrDotStyle',
  'qrCornerStyle',
  'qrForegroundColor',
  'qrBackgroundColor',
  'qrCenterType',
  'qrCenterText',
] as const
const WIFI_FIELDS = [
  'wifiSsid',
  'wifiPassword',
  'wifiEncryption',
  'wifiCenterType',
  'wifiCenterText',
] as const

interface SettingsDraft {
  name: string
  description: string
  logo: string
  headerImage: string
  headerTextColor: string
  sourceUrl: string
  primaryColor: string
  secondaryColor: string
  currency: CurrencyCode
  qrDotStyle: QRDotStyle
  qrCornerStyle: QRCornerStyle
  qrForegroundColor: string
  qrBackgroundColor: string
  qrCenterType: QRCenterType
  qrCenterText: string
  wifiSsid: string
  wifiPassword: string
  wifiEncryption: WifiEncryption
  wifiCenterType: QRCenterType
  wifiCenterText: string
  googleReviewUrl: string
  instagramUrl: string
  tiktokUrl: string
  facebookUrl: string
  templateId: string
  theme: string
  seasonalOverlay: string
}

interface SettingsFormProps {
  canEdit: boolean
  initial: {
    name: string
    description: string
    logo: string
    headerImage: string
    headerTextColor: string
    sourceUrl: string
    primaryColor: string
    secondaryColor: string
    currency: string
    qrDotStyle: string
    qrCornerStyle: string
    qrForegroundColor: string
    qrBackgroundColor: string
    qrCenterType: string
    qrCenterText: string
    wifiSsid: string
    wifiPassword: string
    wifiEncryption: string
    wifiCenterType: string
    wifiCenterText: string
    googleReviewUrl: string
    instagramUrl: string
    tiktokUrl: string
    facebookUrl: string
    templateId: string
    theme: string
    seasonalOverlay: string
  }
  /** R2 URL of the iPhone mockup used by the template picker previews. */
  templatePreviewMockupUrl: string
  /**
   * Real menu data for the template preview. Null when the restaurant
   * hasn't created a menu yet — the preview falls back to demo data.
   */
  templatePreviewData: TemplatePreviewRealData | null
  /** Used only for the live QR preview. `name` is null when there's no
   * real menu yet, in which case the download buttons are hidden. */
  previewMenu: { url: string; name: string | null }
}

// Slug-safe filename.
function toFileStem(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'menu'
  )
}

function createDraftFromInitial(initial: SettingsFormProps['initial']): SettingsDraft {
  return {
    name: initial.name,
    description: initial.description,
    logo: initial.logo,
    headerImage: initial.headerImage,
    headerTextColor: initial.headerTextColor,
    sourceUrl: initial.sourceUrl,
    primaryColor: initial.primaryColor,
    secondaryColor: initial.secondaryColor,
    currency: (initial.currency as CurrencyCode) ?? 'USD',
    qrDotStyle: initial.qrDotStyle as QRDotStyle,
    qrCornerStyle: initial.qrCornerStyle as QRCornerStyle,
    qrForegroundColor: initial.qrForegroundColor,
    qrBackgroundColor: initial.qrBackgroundColor,
    qrCenterType: normalizeCenterType(initial.qrCenterType),
    qrCenterText: initial.qrCenterText,
    wifiSsid: initial.wifiSsid,
    wifiPassword: initial.wifiPassword,
    wifiEncryption: (WIFI_ENCRYPTIONS as string[]).includes(initial.wifiEncryption)
      ? (initial.wifiEncryption as WifiEncryption)
      : 'WPA',
    wifiCenterType: normalizeCenterType(initial.wifiCenterType),
    wifiCenterText: initial.wifiCenterText,
    googleReviewUrl: initial.googleReviewUrl,
    instagramUrl: initial.instagramUrl,
    tiktokUrl: initial.tiktokUrl,
    facebookUrl: initial.facebookUrl,
    templateId: TEMPLATES.some((t) => t.id === initial.templateId)
      ? initial.templateId
      : DEFAULT_TEMPLATE_ID,
    theme: THEMES.some((t) => t.id === initial.theme) ? initial.theme : DEFAULT_THEME_ID,
    seasonalOverlay: SEASONAL_OVERLAYS.some((o) => o.id === initial.seasonalOverlay)
      ? initial.seasonalOverlay
      : DEFAULT_SEASONAL_OVERLAY_ID,
  }
}

export function SettingsForm({
  canEdit,
  initial,
  previewMenu,
  templatePreviewMockupUrl,
  templatePreviewData,
}: SettingsFormProps) {
  const router = useRouter()
  const qrRef = useRef<QRCodeStylingType | null>(null)
  const wifiQrRef = useRef<QRCodeStylingType | null>(null)
  const [draft, setDraft] = useState<SettingsDraft>(() => createDraftFromInitial(initial))
  const [savedDraft, setSavedDraft] = useState<SettingsDraft>(() => createDraftFromInitial(initial))
  const [submitting, setSubmitting] = useState(false)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  const wifiUri = draft.wifiSsid.trim()
    ? buildWifiUri({
        ssid: draft.wifiSsid.trim(),
        password: draft.wifiPassword,
        encryption: draft.wifiEncryption,
      })
    : null

  const disabled = !canEdit || submitting || Boolean(savingSection)

  function isDirty(fields: readonly (keyof SettingsDraft)[]) {
    return fields.some((field) => draft[field] !== savedDraft[field])
  }

  async function saveFields(fields: readonly (keyof SettingsDraft)[], label: string) {
    if (!draft.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }

    const payload = Object.fromEntries(fields.map((field) => [field, draft[field]]))

    setSavingSection(label)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save')
        return
      }
      setSavedDraft((current) => ({ ...current, ...payload }))
      toast.success(`${label} saved`)
      router.refresh()
    } catch {
      toast.error('Network error â€” please try again')
    } finally {
      setSavingSection(null)
    }
  }

  const restaurantDirty = isDirty(RESTAURANT_FIELDS)
  const linksDirty = isDirty(LINKS_FIELDS)
  const menuDesignDirty = isDirty(MENU_DESIGN_FIELDS)
  const brandDirty = isDirty(BRAND_FIELDS)
  const qrDirty = isDirty(QR_FIELDS)
  const wifiDirty = isDirty(WIFI_FIELDS)
  const anyDirty =
    restaurantDirty || linksDirty || menuDesignDirty || brandDirty || qrDirty || wifiDirty

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) {
      toast.error('Restaurant name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save')
        return
      }
      setSavedDraft(draft)
      toast.success('Saved')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={save} className="border-cream-line bg-card space-y-6 rounded-2xl border p-8">
      {!canEdit && (
        <p className="bg-background/50 border-cream-line text-muted-foreground rounded-lg border p-3 text-xs">
          Only owners and admins can edit these settings.
        </p>
      )}

      <section id="settings-restaurant" className="scroll-mt-24 space-y-4">
        <SectionHeading>Restaurant</SectionHeading>

        <div className="space-y-2">
          <Label htmlFor="org-name">Restaurant name *</Label>
          <Input
            id="org-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            disabled={disabled}
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
            disabled={disabled}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-source-url">Website</Label>
          <Input
            id="org-source-url"
            type="url"
            value={draft.sourceUrl}
            onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
            disabled={disabled}
            placeholder="https://…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-currency">Currency</Label>
          <Select
            value={draft.currency}
            onValueChange={(v) => setDraft({ ...draft, currency: v as CurrencyCode })}
            disabled={disabled}
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
          <p className="text-muted-foreground text-xs">
            Applies to every menu on this restaurant, including existing ones.
          </p>
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={restaurantDirty}
            disabled={disabled}
            saving={savingSection === 'Restaurant'}
            onClick={() => saveFields(RESTAURANT_FIELDS, 'Restaurant')}
          />
        </SectionFooter>
      </section>

      <section
        id="settings-links"
        className="border-cream-line/60 scroll-mt-24 space-y-4 border-t pt-6"
      >
        <SectionHeading>Links</SectionHeading>
        <p className="text-muted-foreground text-xs">
          Shown in your menu&apos;s footer so guests can review you or follow along. Leave any field
          blank to hide it.
        </p>

        <div className="space-y-2">
          <Label htmlFor="google-review-url">Google review link</Label>
          <Input
            id="google-review-url"
            value={draft.googleReviewUrl}
            onChange={(e) => setDraft({ ...draft, googleReviewUrl: e.target.value })}
            disabled={disabled}
            placeholder="g.page/r/…/review"
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            Paste the review link from your Google Business profile. No need to type
            &ldquo;https://&rdquo; — we&apos;ll add it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <HandleField
            id="instagram-url"
            label="Instagram"
            value={draft.instagramUrl}
            onChange={(v) => setDraft({ ...draft, instagramUrl: v })}
            disabled={disabled}
            placeholder="yourhandle"
          />
          <HandleField
            id="tiktok-url"
            label="TikTok"
            value={draft.tiktokUrl}
            onChange={(v) => setDraft({ ...draft, tiktokUrl: v })}
            disabled={disabled}
            placeholder="yourhandle"
          />
          <HandleField
            id="facebook-url"
            label="Facebook"
            value={draft.facebookUrl}
            onChange={(v) => setDraft({ ...draft, facebookUrl: v })}
            disabled={disabled}
            placeholder="yourpage"
          />
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={linksDirty}
            disabled={disabled}
            saving={savingSection === 'Links'}
            onClick={() => saveFields(LINKS_FIELDS, 'Links')}
          />
        </SectionFooter>
      </section>

      <section
        id="settings-menu-design"
        className="border-cream-line/60 scroll-mt-24 space-y-4 border-t pt-6"
      >
        <SectionHeading>Menu design</SectionHeading>
        <p className="text-muted-foreground text-xs">
          Pick how your public menu is laid out. The preview shows{' '}
          {templatePreviewData
            ? 'your actual menu'
            : 'a sample menu (create a real one to preview it here)'}
          , and updates live as you switch templates or change brand colors.
        </p>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Template selector list + Theme + Seasonal overlay pickers */}
          <div className="order-2 space-y-6 md:order-1">
            <div>
              <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Layout
              </div>
              <div role="radiogroup" aria-label="Menu template" className="space-y-2.5">
                {TEMPLATES.map((tpl) => {
                  const selected = draft.templateId === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() => setDraft((prev) => ({ ...prev, templateId: tpl.id }))}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-[14px] border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-pop bg-pop/5 ring-pop/20 ring-2'
                          : 'border-cream-line hover:border-foreground/30 hover:bg-card/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground text-sm font-semibold tracking-tight">
                          {tpl.label}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                          {tpl.description}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border transition-colors',
                          selected
                            ? 'border-pop bg-pop text-pop-foreground'
                            : 'border-cream-line bg-background',
                        )}
                      >
                        {selected && <Check className="size-3.5" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Theme
              </div>
              <div
                role="radiogroup"
                aria-label="Menu theme"
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {THEMES.map((th) => {
                  const selected = draft.theme === th.id
                  const c = th.colors
                  return (
                    <button
                      key={th.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() => setDraft((prev) => ({ ...prev, theme: th.id }))}
                      className={cn(
                        'flex items-center gap-3 rounded-[14px] border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-pop bg-pop/5 ring-pop/20 ring-2'
                          : 'border-cream-line hover:border-foreground/30 hover:bg-card/60',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="border-cream-line flex size-9 shrink-0 overflow-hidden rounded-full border"
                        style={{ backgroundColor: c.background }}
                      >
                        <span
                          className="block h-full w-1/3"
                          style={{ backgroundColor: c.foreground }}
                        />
                        <span
                          className="block h-full w-1/3"
                          style={{ backgroundColor: c.accent }}
                        />
                        <span className="block h-full w-1/3" style={{ backgroundColor: c.pop }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-foreground text-sm font-semibold tracking-tight"
                          style={{ fontFamily: th.headingFontFamily }}
                        >
                          {th.label}
                        </div>
                        <p className="text-muted-foreground mt-0.5 truncate text-[11px] leading-snug">
                          {th.description}
                        </p>
                      </div>
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="bg-pop text-pop-foreground grid size-5 shrink-0 place-items-center rounded-full"
                        >
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Seasonal touch
              </div>
              <div
                role="radiogroup"
                aria-label="Seasonal overlay"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {SEASONAL_OVERLAYS.map((ov) => {
                  const selected = draft.seasonalOverlay === ov.id
                  return (
                    <button
                      key={ov.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={disabled}
                      onClick={() => setDraft((prev) => ({ ...prev, seasonalOverlay: ov.id }))}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-[12px] border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-pop bg-pop/5 ring-pop/20 ring-2'
                          : 'border-cream-line hover:border-foreground/30 hover:bg-card/60',
                      )}
                    >
                      <span className="text-foreground text-xs font-semibold tracking-tight">
                        {ov.label}
                      </span>
                      <span className="text-muted-foreground text-[10px] leading-snug">
                        {ov.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <ColorField
                id="header-text-color"
                label="Restaurant name color"
                value={draft.headerTextColor}
                disabled={disabled}
                onChange={(v) => setDraft((prev) => ({ ...prev, headerTextColor: v }))}
              />
              <p className="text-muted-foreground text-[11px] leading-snug">
                Overrides the restaurant name color on the public menu — useful when a header image
                makes the default hard to read. Leave empty to use the theme default.
              </p>
            </div>
          </div>

          {/* Big live preview, sticky on desktop so it stays in view while
              the owner scrolls or tweaks brand colors elsewhere. */}
          <div className="order-1 md:order-2">
            <div className="mx-auto w-full max-w-[300px] md:sticky md:top-6">
              <TemplatePreview
                templateId={draft.templateId}
                mockupUrl={templatePreviewMockupUrl}
                primaryColor={draft.primaryColor || null}
                secondaryColor={draft.secondaryColor || null}
                realData={templatePreviewData}
                themeId={draft.theme}
                seasonalOverlayId={draft.seasonalOverlay}
                restaurantName={draft.name}
                menuName={previewMenu.name}
                logoUrl={draft.logo || null}
                headerImageUrl={draft.headerImage || null}
                headerTextColor={draft.headerTextColor || null}
                wifiSsid={draft.wifiSsid || null}
                liveUrl={previewMenu.name ? previewMenu.url : null}
              />
            </div>
          </div>
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={menuDesignDirty}
            disabled={disabled}
            saving={savingSection === 'Menu design'}
            onClick={() => saveFields(MENU_DESIGN_FIELDS, 'Menu design')}
          />
        </SectionFooter>
      </section>

      <section
        id="settings-brand"
        className="border-cream-line/60 scroll-mt-24 space-y-4 border-t pt-6"
      >
        <SectionHeading>Brand</SectionHeading>

        <div className="space-y-2">
          <Label>Logo</Label>
          <LogoUploader
            value={draft.logo}
            onChange={(url) => setDraft({ ...draft, logo: url })}
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label>Header image</Label>
          <HeaderImageUploader
            value={draft.headerImage}
            onChange={(url) => setDraft({ ...draft, headerImage: url })}
            disabled={disabled}
          />
          <p className="text-muted-foreground text-xs">
            Shown behind your restaurant name at the top of the menu. Wide landscape photos read
            best (roughly 1600×900). Leave empty to keep the brand-color gradient.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorField
            id="primary-color"
            label="Main color"
            value={draft.primaryColor}
            disabled={disabled}
            onChange={(v) => setDraft((prev) => ({ ...prev, primaryColor: v }))}
          />
          <ColorField
            id="secondary-color"
            label="Accent color"
            value={draft.secondaryColor}
            disabled={disabled}
            onChange={(v) => setDraft((prev) => ({ ...prev, secondaryColor: v }))}
          />
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={brandDirty}
            disabled={disabled}
            saving={savingSection === 'Brand'}
            onClick={() => saveFields(BRAND_FIELDS, 'Brand')}
          />
        </SectionFooter>
      </section>

      <section
        id="settings-qr"
        className="border-cream-line/60 scroll-mt-24 space-y-4 border-t pt-6"
      >
        <SectionHeading>QR code style</SectionHeading>
        <p className="text-muted-foreground text-xs">
          Applies to every menu QR you generate. Preview uses your most recent menu.
        </p>

        <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qr-dot-style">Dot style</Label>
                <Select
                  value={draft.qrDotStyle}
                  onValueChange={(v) => setDraft({ ...draft, qrDotStyle: v as QRDotStyle })}
                  disabled={disabled}
                >
                  <SelectTrigger id="qr-dot-style" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QR_DOT_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qr-corner-style">Corner style</Label>
                <Select
                  value={draft.qrCornerStyle}
                  onValueChange={(v) => setDraft({ ...draft, qrCornerStyle: v as QRCornerStyle })}
                  disabled={disabled}
                >
                  <SelectTrigger id="qr-corner-style" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QR_CORNER_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorField
                id="qr-fg"
                label="Foreground"
                value={draft.qrForegroundColor}
                disabled={disabled}
                onChange={(v) => setDraft((prev) => ({ ...prev, qrForegroundColor: v }))}
              />
              <ColorField
                id="qr-bg"
                label="Background"
                value={draft.qrBackgroundColor}
                disabled={disabled}
                onChange={(v) => setDraft((prev) => ({ ...prev, qrBackgroundColor: v }))}
              />
            </div>

            {(draft.primaryColor || draft.secondaryColor) && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setDraft({
                    ...draft,
                    qrForegroundColor: draft.primaryColor || draft.qrForegroundColor,
                    qrBackgroundColor: draft.secondaryColor || draft.qrBackgroundColor,
                  })
                }
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs underline-offset-2 hover:underline disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className="border-cream-line inline-flex size-4 overflow-hidden rounded-full border"
                >
                  <span
                    className="block w-1/2"
                    style={{ background: draft.primaryColor || 'transparent' }}
                  />
                  <span
                    className="block w-1/2"
                    style={{ background: draft.secondaryColor || 'transparent' }}
                  />
                </span>
                Use my brand colors
              </button>
            )}

            <CenterPicker
              idPrefix="qr"
              centerType={draft.qrCenterType}
              centerText={draft.qrCenterText}
              hasLogo={Boolean(draft.logo)}
              disabled={disabled}
              onCenterTypeChange={(t) => setDraft({ ...draft, qrCenterType: t })}
              onCenterTextChange={(t) => setDraft({ ...draft, qrCenterText: t })}
            />
          </div>

          <div className="border-cream-line flex flex-col items-center gap-3 rounded-xl border p-4">
            <div
              className="overflow-hidden rounded-xl"
              style={{ backgroundColor: draft.qrBackgroundColor }}
            >
              <QRCodeRenderer
                data={previewMenu.url}
                size={180}
                dotStyle={draft.qrDotStyle}
                cornerStyle={draft.qrCornerStyle}
                foregroundColor={draft.qrForegroundColor}
                backgroundColor={draft.qrBackgroundColor}
                centerType={draft.qrCenterType}
                centerText={draft.qrCenterText}
                logo={draft.logo || null}
                onReady={(q) => (qrRef.current = q)}
              />
            </div>
            {previewMenu.name ? (
              <>
                <p className="text-muted-foreground truncate text-[11px]">{previewMenu.name}</p>
                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!qrRef.current) return
                      downloadQR(qrRef.current, `${toFileStem(previewMenu.name!)}-qr`, 'svg')
                    }}
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    SVG
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!qrRef.current) return
                      downloadQR(qrRef.current, `${toFileStem(previewMenu.name!)}-qr`, 'png')
                    }}
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    PNG
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-[11px]">Create a menu to download a QR.</p>
            )}
          </div>
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={qrDirty}
            disabled={disabled}
            saving={savingSection === 'QR code style'}
            onClick={() => saveFields(QR_FIELDS, 'QR code style')}
          />
        </SectionFooter>
      </section>

      <section
        id="settings-wifi"
        className="border-cream-line/60 scroll-mt-24 space-y-4 border-t pt-6"
      >
        <SectionHeading>WiFi</SectionHeading>
        <p className="text-muted-foreground text-xs">
          Guests see a &quot;Show WiFi&quot; button on your menu to reveal and copy the password.
          Download the WiFi QR below for table cards — modern phones auto-join when their camera
          scans it.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_220px] sm:items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wifi-ssid">Network name (SSID)</Label>
              <Input
                id="wifi-ssid"
                value={draft.wifiSsid}
                onChange={(e) => setDraft({ ...draft, wifiSsid: e.target.value })}
                disabled={disabled}
                maxLength={32}
                placeholder="e.g. Bistro-Guest"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wifi-encryption">Security</Label>
              <Select
                value={draft.wifiEncryption}
                onValueChange={(v) => setDraft({ ...draft, wifiEncryption: v as WifiEncryption })}
                disabled={disabled}
              >
                <SelectTrigger id="wifi-encryption">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA / WPA2 / WPA3</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">None (open network)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.wifiEncryption !== 'nopass' && (
              <div className="space-y-2">
                <Label htmlFor="wifi-password">Password</Label>
                <Input
                  id="wifi-password"
                  type="text"
                  value={draft.wifiPassword}
                  onChange={(e) => setDraft({ ...draft, wifiPassword: e.target.value })}
                  disabled={disabled}
                  maxLength={63}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  Stored so you can update it; shown on your menu only when a guest taps to reveal.
                </p>
              </div>
            )}

            <CenterPicker
              idPrefix="wifi"
              centerType={draft.wifiCenterType}
              centerText={draft.wifiCenterText}
              hasLogo={Boolean(draft.logo)}
              disabled={disabled}
              onCenterTypeChange={(t) => setDraft({ ...draft, wifiCenterType: t })}
              onCenterTextChange={(t) => setDraft({ ...draft, wifiCenterText: t })}
            />
          </div>

          <div className="border-cream-line flex flex-col items-center gap-3 rounded-xl border p-4">
            {wifiUri ? (
              <>
                <div
                  className="overflow-hidden rounded-xl"
                  style={{ backgroundColor: draft.qrBackgroundColor }}
                >
                  <QRCodeRenderer
                    data={wifiUri}
                    size={180}
                    dotStyle={draft.qrDotStyle}
                    cornerStyle={draft.qrCornerStyle}
                    foregroundColor={draft.qrForegroundColor}
                    backgroundColor={draft.qrBackgroundColor}
                    centerType={draft.wifiCenterType}
                    centerText={draft.wifiCenterText}
                    logo={draft.logo || null}
                    onReady={(q) => (wifiQrRef.current = q)}
                  />
                </div>
                <p className="text-muted-foreground truncate text-[11px]">
                  {draft.wifiSsid.trim()}
                </p>
                <div className="flex w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!wifiQrRef.current) return
                      downloadQR(
                        wifiQrRef.current,
                        `${toFileStem(draft.wifiSsid.trim())}-wifi`,
                        'svg',
                      )
                    }}
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    SVG
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!wifiQrRef.current) return
                      downloadQR(
                        wifiQrRef.current,
                        `${toFileStem(draft.wifiSsid.trim())}-wifi`,
                        'png',
                      )
                    }}
                  >
                    <Download className="size-3.5" aria-hidden="true" />
                    PNG
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground px-2 py-8 text-center text-[11px]">
                Enter a network name to generate a WiFi QR.
              </p>
            )}
          </div>
        </div>

        <SectionFooter>
          <SectionSaveButton
            dirty={wifiDirty}
            disabled={disabled}
            saving={savingSection === 'WiFi'}
            onClick={() => saveFields(WIFI_FIELDS, 'WiFi')}
          />
        </SectionFooter>
      </section>

      {canEdit && (
        <Button type="submit" size="lg" disabled={submitting || !anyDirty} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Saving…</span>
            </>
          ) : (
            <span>{anyDirty ? 'Save all unsaved changes' : 'All changes saved'}</span>
          )}
        </Button>
      )}
    </form>
  )
}

function SectionSaveButton({
  dirty,
  disabled,
  saving,
  onClick,
}: {
  dirty: boolean
  disabled: boolean
  saving: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={dirty ? 'default' : 'outline'}
      size="sm"
      disabled={disabled || !dirty}
      onClick={onClick}
      className="shrink-0"
    >
      {saving ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          <span>Saving…</span>
        </>
      ) : dirty ? (
        <span>Save section</span>
      ) : (
        <span>Saved</span>
      )}
    </Button>
  )
}

function SectionFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end pt-2">{children}</div>
}

function HandleField({
  id,
  label,
  value,
  disabled,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
  placeholder?: string
}) {
  // Strip a typed `@` so the visible value stays aligned with the prefix
  // adornment. Users can still paste `@handle` or a URL — the server-side
  // normalize covers both.
  const display = value.replace(/^@/, '')
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="border-cream-line bg-card focus-within:border-foreground/40 focus-within:bg-background flex h-9 items-center rounded-md border px-3 text-sm transition-colors">
        <span aria-hidden="true" className="text-muted-foreground pr-1">
          @
        </span>
        <input
          id={id}
          type="text"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="placeholder:text-muted-foreground/60 h-full flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  // Local draft so dragging the native picker feels instant. The native
  // <input type="color"> fires onInput on every pixel drag; propagating each
  // tick up to the parent triggers a QR re-render (qr-code-styling update),
  // which lags on slower devices. We mirror the picker value locally and
  // debounce the bubble-up so the QR only redraws a few times per second.
  const [local, setLocal] = useState(value)

  // Sync when the parent value changes (e.g. "Use my brand colors" preset).
  useEffect(() => {
    setLocal(value)
  }, [value])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function schedulePropagate(next: string) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), 120)
  }

  function handlePickerChange(next: string) {
    const upper = next.toUpperCase()
    setLocal(upper)
    schedulePropagate(upper)
  }

  function handleTextChange(next: string) {
    setLocal(next)
    // Only propagate once it's a complete hex — avoids thrashing while typing.
    if (/^#[0-9A-Fa-f]{6}$/.test(next) || next === '') {
      schedulePropagate(next)
    }
  }

  function handleTextBlur() {
    // On blur, always flush — catches intermediate states the user settled on.
    if (timerRef.current) clearTimeout(timerRef.current)
    if (local !== value) onChange(local)
  }

  // Native <input type="color"> requires a 7-char hex; fall back to white
  // for the picker when the field is empty so it doesn't render invalid.
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(local) ? local : '#FFFFFF'
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => handlePickerChange(e.target.value)}
          disabled={disabled}
          className="border-cream-line size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
          aria-label={`${label} picker`}
        />
        <Input
          id={id}
          value={local}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          disabled={disabled}
          placeholder="#000000"
          className="font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
    </div>
  )
}

function CenterPicker({
  idPrefix,
  centerType,
  centerText,
  hasLogo,
  disabled,
  onCenterTypeChange,
  onCenterTextChange,
}: {
  idPrefix: string
  centerType: QRCenterType
  centerText: string
  hasLogo: boolean
  disabled: boolean
  onCenterTypeChange: (t: QRCenterType) => void
  onCenterTextChange: (t: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Center content</Label>
      <div role="radiogroup" aria-label="Center content" className="grid grid-cols-3 gap-2">
        {(
          [
            { value: 'none', label: 'None' },
            { value: 'logo', label: 'Logo' },
            { value: 'text', label: 'Text' },
          ] as const
        ).map((opt) => {
          const selected = centerType === opt.value
          const logoMissing = opt.value === 'logo' && !hasLogo
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || logoMissing}
              onClick={() => onCenterTypeChange(opt.value as QRCenterType)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-cream-line hover:border-foreground/40',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              title={logoMissing ? 'Add a restaurant logo first' : undefined}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {centerType === 'text' && (
        <>
          <Input
            id={`${idPrefix}-center-text`}
            value={centerText}
            onChange={(e) => onCenterTextChange(e.target.value.slice(0, 4))}
            disabled={disabled}
            maxLength={4}
            placeholder="e.g. JR"
            className="mt-2"
          />
          <p className="text-muted-foreground text-xs">
            Up to 4 characters so the QR stays scannable.
          </p>
        </>
      )}
    </div>
  )
}
