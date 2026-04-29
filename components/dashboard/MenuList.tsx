'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Check, Copy, ExternalLink, Pencil, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PillButton } from '@/components/ui/pill-button'
import { TransitionLink } from '@/components/navigation/TransitionLink'

interface MenuListItem {
  id: string
  slug: string
  name: string
  createdAt: Date
  itemCount: number
}

interface MenuListProps {
  menus: MenuListItem[]
  publicBaseUrl: string
}

export function MenuList({ menus, publicBaseUrl }: MenuListProps) {
  const t = useTranslations('Dashboard.menus')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyLink(id: string, slug: string) {
    navigator.clipboard.writeText(`${publicBaseUrl}/m/${slug}`).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-[12px] font-medium tracking-[0.14em] uppercase">
        {t('sectionTitle')}
      </h2>
      <ul className="space-y-3">
        {menus.map((m) => (
          <li
            key={m.id}
            className="border-cream-line bg-card flex flex-col gap-3 rounded-[20px] border p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="truncate text-lg font-semibold tracking-[-0.01em]">{m.name}</h3>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {t('itemsCount', { count: m.itemCount })}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                /m/{m.slug}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <TransitionLink
                  href={`/dashboard/menus/${m.slug}/edit`}
                  transitionType="nav-forward"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('edit')}
                </TransitionLink>
              </Button>
              <Button asChild size="sm" variant="outline">
                <TransitionLink href={`/dashboard/menus/${m.slug}/qr`} transitionType="nav-forward">
                  <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                  QR
                </TransitionLink>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLink(m.id, m.slug)}
              >
                {copiedId === m.id ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('copyLink')}
                  </>
                )}
              </Button>
              <PillButton asChild size="sm" variant="primary">
                <Link href={`/m/${m.slug}`} target="_blank" rel="noopener">
                  {t('viewMenu')}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </PillButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
