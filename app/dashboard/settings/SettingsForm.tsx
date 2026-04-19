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
  return VALID_CENTER_TYPES.includes(value as QRCenterType)
    ? (value as QRCenterType)
    : 'none'
}

interface SettingsDraft {
  name: string
  description: string
  logo: string
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
}

interface SettingsFormProps {
  canEdit: boolean
  initial: {
    name: string
    description: string
    logo: string
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
  }
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

export function SettingsForm({ canEdit, initial, previewMenu }: SettingsFormProps) {
  const router = useRouter()
  const qrRef = useRef<QRCodeStylingType | null>(null)
  const wifiQrRef = useRef<QRCodeStylingType | null>(null)
  const [draft, setDraft] = useState<SettingsDraft>({
    name: initial.name,
    description: initial.description,
    logo: initial.logo,
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
  })
  const [submitting, setSubmitting] = useState(false)

  const wifiUri = draft.wifiSsid.trim()
    ? buildWifiUri({
        ssid: draft.wifiSsid.trim(),
        password: draft.wifiPassword,
        encryption: draft.wifiEncryption,
      })
    : null

  const disabled = !canEdit || submitting

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
      toast.success('Saved')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={save}
      className="border-cream-line bg-card space-y-6 rounded-2xl border p-8"
    >
      {!canEdit && (
        <p className="bg-background/50 border-cream-line text-muted-foreground rounded-lg border p-3 text-xs">
          Only owners and admins can edit these settings.
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          Restaurant
        </h2>

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
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          Brand
        </h2>

        <div className="space-y-2">
          <Label>Logo</Label>
          <LogoUploader
            value={draft.logo}
            onChange={(url) => setDraft({ ...draft, logo: url })}
            disabled={disabled}
          />
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
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          QR code style
        </h2>
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
                  onValueChange={(v) =>
                    setDraft({ ...draft, qrDotStyle: v as QRDotStyle })
                  }
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
                  onValueChange={(v) =>
                    setDraft({ ...draft, qrCornerStyle: v as QRCornerStyle })
                  }
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
                className="text-muted-foreground hover:text-foreground disabled:opacity-50 inline-flex items-center gap-2 text-xs underline-offset-2 hover:underline"
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
                <p className="text-muted-foreground truncate text-[11px]">
                  {previewMenu.name}
                </p>
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
              <p className="text-muted-foreground text-[11px]">
                Create a menu to download a QR.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
          WiFi
        </h2>
        <p className="text-muted-foreground text-xs">
          Guests see a &quot;Show WiFi&quot; button on your menu to reveal and copy the
          password. Download the WiFi QR below for table cards — modern phones auto-join
          when their camera scans it.
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
                onValueChange={(v) =>
                  setDraft({ ...draft, wifiEncryption: v as WifiEncryption })
                }
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
                  Stored so you can update it; shown on your menu only when a guest taps
                  to reveal.
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
      </section>

      {canEdit && (
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Saving…</span>
            </>
          ) : (
            <span>Save changes</span>
          )}
        </Button>
      )}
    </form>
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
          className="border-cream-line size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
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
      <div
        role="radiogroup"
        aria-label="Center content"
        className="grid grid-cols-3 gap-2"
      >
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
