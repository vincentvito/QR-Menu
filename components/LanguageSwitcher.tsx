'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
] as const

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('LanguageSwitcher')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const switchLocale = (locale: string) => {
    if (locale === currentLocale) return
    document.cookie = `locale=${locale};path=/;max-age=31536000`
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div role="group" aria-label={t('label')} className="flex items-center gap-1">
      {LOCALES.map(({ code, label }) => {
        const active = currentLocale === code
        return (
          <Button
            key={code}
            onClick={() => switchLocale(code)}
            disabled={isPending}
            variant={active ? 'default' : 'ghost'}
            size="sm"
            aria-pressed={active}
            aria-label={t(code)}
            className="h-11 px-3 text-xs sm:h-8 sm:px-2"
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}
