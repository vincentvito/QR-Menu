'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeading } from '@/components/ui/section-heading'
import { cn } from '@/lib/utils'
import { settingsSectionFocusClass, useSettingsFocus } from './SettingsFocus'

export function DangerZone({ restaurantName }: { restaurantName: string }) {
  const t = useTranslations('Settings')
  const router = useRouter()
  const { activeSection, setActiveSection } = useSettingsFocus()
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletingRestaurant, setDeletingRestaurant] = useState(false)
  const canDeleteRestaurant = deleteConfirmation.trim().toLowerCase() === 'confirm'

  async function deleteRestaurant() {
    if (!canDeleteRestaurant) {
      toast.error(t('errors.confirmDelete'))
      return
    }

    setDeletingRestaurant(true)
    try {
      const response = await fetch('/api/restaurants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation.trim().toLowerCase() }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error ?? t('errors.deleteFailed'))
        return
      }
      toast.success(t('toast.deleted', { name: restaurantName }))
      setDeleteConfirmation('')
      router.push('/dashboard/settings')
      router.refresh()
    } catch {
      toast.error(t('errors.network'))
    } finally {
      setDeletingRestaurant(false)
    }
  }

  return (
    <section
      id="settings-danger"
      className={cn(
        'border-destructive/25 bg-destructive/5 scroll-mt-24 space-y-4 rounded-2xl border p-5',
        settingsSectionFocusClass(activeSection === 'settings-danger'),
      )}
      onPointerDownCapture={() => setActiveSection('settings-danger')}
      onFocusCapture={() => setActiveSection('settings-danger')}
    >
      <div className="space-y-1">
        <SectionHeading>{t('danger.title')}</SectionHeading>
        <p className="text-muted-foreground text-xs leading-5">{t('danger.description')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="delete-restaurant-confirmation">{t('danger.confirmLabel')}</Label>
        <Input
          id="delete-restaurant-confirmation"
          value={deleteConfirmation}
          onChange={(event) => setDeleteConfirmation(event.target.value)}
          disabled={deletingRestaurant}
          autoComplete="off"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={deleteRestaurant}
          disabled={deletingRestaurant || !canDeleteRestaurant}
        >
          {deletingRestaurant ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3.5" aria-hidden="true" />
          )}
          {t('danger.deleteButton')}
        </Button>
      </div>
    </section>
  )
}
