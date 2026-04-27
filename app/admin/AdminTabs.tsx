'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
] as const

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 -mb-px">
      {TABS.map((tab) => {
        const isActive = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 px-3 py-2.5 text-sm transition-colors',
              isActive
                ? 'border-foreground text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
