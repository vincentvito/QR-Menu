'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// Section IDs and labels must mirror the <section id="..."> anchors on
// the Settings page. Keeping them together makes additions easy to audit.
export const SETTINGS_SECTIONS = [
  { id: 'settings-restaurant', labelKey: 'restaurant' },
  { id: 'settings-links', labelKey: 'links' },
  { id: 'settings-menu-design', labelKey: 'menuDesign' },
  { id: 'settings-brand', labelKey: 'brand' },
  { id: 'settings-qr', labelKey: 'qr' },
  { id: 'settings-wifi', labelKey: 'wifi' },
  { id: 'settings-analytics-reports', labelKey: 'analyticsReports' },
] as const

// Sticky left-hand quick-nav for the Settings page. Clicking a label
// smooth-scrolls the section into view with an offset that clears the
// dashboard's sticky header. Scroll-spy highlights whichever section is
// currently under the top of the viewport.
export function SettingsSideNav() {
  const t = useTranslations('Settings')
  const [active, setActive] = useState<string>(SETTINGS_SECTIONS[0].id)

  useEffect(() => {
    // rootMargin pushes the "active" band toward the top of the
    // viewport — a section is considered active as soon as it crosses
    // roughly 25% down from the top, which feels natural while
    // scrolling through a long form.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )

    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Update the URL hash so the address bar reflects the section,
    // without the default jump that `href="#..."` would cause.
    history.replaceState(null, '', `#${id}`)
    setActive(id)
  }

  return (
    <nav aria-label={t('sectionsAria')} className="flex flex-col gap-1">
      {SETTINGS_SECTIONS.map((s) => {
        const isActive = active === s.id
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => handleClick(e, s.id)}
            aria-current={isActive ? 'location' : undefined}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:bg-card hover:text-foreground',
            )}
          >
            {t(`sections.${s.labelKey}`)}
          </a>
        )
      })}
    </nav>
  )
}
