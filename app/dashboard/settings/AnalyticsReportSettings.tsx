'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarClock, CheckCircle2, Clock3, Loader2, Mail, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { settingsSectionFocusClass, useSettingsFocus } from './SettingsFocus'
import type { AnalyticsReportFrequency } from '@/lib/analytics/report-schedule'

interface ReportRecipient {
  id: string
  email: string
  verified: boolean
}

interface AnalyticsReportSettingsProps {
  canManage: boolean
  accountEmail: string
  initial: {
    frequency: AnalyticsReportFrequency
    timezone: string
    recipients: ReportRecipient[]
  }
}

interface SettingsResponse {
  frequency: AnalyticsReportFrequency
  timezone: string
  recipients: ReportRecipient[]
  error?: string
}

function detectedTimeZone(fallback: string) {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
}

export function AnalyticsReportSettings({
  canManage,
  accountEmail,
  initial,
}: AnalyticsReportSettingsProps) {
  const t = useTranslations('Settings.analyticsReports')
  const { activeSection, setActiveSection } = useSettingsFocus()
  const locale = useLocale()
  const [frequency, setFrequency] = useState(initial.frequency)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [recipients, setRecipients] = useState(initial.recipients)
  const [email, setEmail] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [removingRecipientId, setRemovingRecipientId] = useState<string | null>(null)
  const enabled = frequency !== 'off'

  async function updateSettings(nextFrequency: AnalyticsReportFrequency, nextTimezone: string) {
    const previous = { frequency, timezone, recipients }
    setFrequency(nextFrequency)
    setTimezone(nextTimezone)
    setSavingSettings(true)
    try {
      const response = await fetch('/api/analytics-reports/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: nextFrequency, timezone: nextTimezone, locale }),
      })
      const body = (await response.json()) as SettingsResponse
      if (!response.ok) throw new Error(body.error ?? t('errors.saveFailed'))
      setFrequency(body.frequency)
      setTimezone(body.timezone)
      setRecipients(body.recipients)
      toast.success(body.frequency === 'off' ? t('toast.disabled') : t('toast.updated'))
    } catch (error) {
      setFrequency(previous.frequency)
      setTimezone(previous.timezone)
      setRecipients(previous.recipients)
      toast.error(error instanceof Error ? error.message : t('errors.network'))
    } finally {
      setSavingSettings(false)
    }
  }

  async function addRecipient(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setAddingRecipient(true)
    try {
      const response = await fetch('/api/analytics-reports/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, locale }),
      })
      const body = (await response.json()) as {
        recipient?: ReportRecipient
        confirmationSent?: boolean
        error?: string
      }
      if (!response.ok || !body.recipient) {
        throw new Error(body.error ?? t('errors.addFailed'))
      }
      const recipient = body.recipient
      setRecipients((current) => [...current.filter(({ id }) => id !== recipient.id), recipient])
      setEmail('')
      toast.success(body.confirmationSent ? t('toast.confirmationSent') : t('toast.recipientAdded'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.network'))
    } finally {
      setAddingRecipient(false)
    }
  }

  async function removeRecipient(id: string) {
    setRemovingRecipientId(id)
    try {
      const response = await fetch('/api/analytics-reports/recipients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const body = (await response.json()) as { reportsDisabled?: boolean; error?: string }
      if (!response.ok) throw new Error(body.error ?? t('errors.removeFailed'))
      setRecipients((current) => current.filter((recipient) => recipient.id !== id))
      if (body.reportsDisabled) setFrequency('off')
      toast.success(
        body.reportsDisabled ? t('toast.lastRecipientRemoved') : t('toast.recipientRemoved'),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.network'))
    } finally {
      setRemovingRecipientId(null)
    }
  }

  return (
    <section
      id="settings-analytics-reports"
      className={cn(
        'border-cream-line bg-card scroll-mt-24 rounded-2xl border p-6 sm:p-8',
        settingsSectionFocusClass(activeSection === 'settings-analytics-reports'),
      )}
      onPointerDownCapture={() => setActiveSection('settings-analytics-reports')}
      onFocusCapture={() => setActiveSection('settings-analytics-reports')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="bg-background border-cream-line mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <Mail className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">{t('title')}</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-5">{t('description')}</p>
          </div>
        </div>
        <Switch
          id="analytics-reports-enabled"
          checked={enabled}
          onCheckedChange={(checked) =>
            updateSettings(
              checked ? 'weekly' : 'off',
              checked ? detectedTimeZone(timezone) : timezone,
            )
          }
          disabled={!canManage || savingSettings}
          aria-label={t('enabledLabel')}
        />
      </div>

      {!canManage ? (
        <p className="bg-background/50 border-cream-line text-muted-foreground mt-5 rounded-lg border p-3 text-xs">
          {t('readOnly')}
        </p>
      ) : null}

      {enabled ? (
        <div className="border-cream-line/70 mt-6 space-y-6 border-t pt-6">
          <div className="space-y-2">
            <Label>{t('frequencyLabel')}</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={frequency}
              onValueChange={(value) => {
                if (value === 'daily' || value === 'weekly') updateSettings(value, timezone)
              }}
              disabled={!canManage || savingSettings}
              className="grid w-full grid-cols-2"
            >
              <ToggleGroupItem value="daily" className="w-full">
                {t('daily')}
              </ToggleGroupItem>
              <ToggleGroupItem value="weekly" className="w-full">
                {t('weekly')}
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">{t('weeklyRecommended')}</p>
          </div>

          <div className="space-y-2">
            <div className="bg-background border-cream-line flex items-start gap-2 rounded-lg border p-3">
              <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-sm">
                {frequency === 'daily' ? t('deliveryDaily') : t('deliveryWeekly')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>{t('recipientsLabel')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('recipientsHint')}</p>
            </div>
            <div className="space-y-2">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="border-cream-line bg-background flex items-center gap-3 rounded-xl border px-3 py-2.5"
                >
                  {recipient.verified ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Clock3 className="size-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{recipient.email}</p>
                    <p className="text-muted-foreground text-xs">
                      {recipient.verified ? t('active') : t('pending')}
                      {recipient.email === accountEmail.toLowerCase()
                        ? ` · ${t('accountEmail')}`
                        : ''}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canManage || removingRecipientId !== null}
                        aria-label={t('removeRecipient', { email: recipient.email })}
                      >
                        {removingRecipientId === recipient.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('confirmRemoveTitle', { email: recipient.email })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {recipients.length === 1
                            ? t('confirmRemoveLastDescription')
                            : t('confirmRemoveDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => removeRecipient(recipient.id)}
                        >
                          {t('confirmRemove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>

            <form onSubmit={addRecipient} className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('emailPlaceholder')}
                aria-label={t('emailLabel')}
                disabled={!canManage || addingRecipient}
                required
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!canManage || addingRecipient || !email.trim()}
              >
                {addingRecipient ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('addRecipient')}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
