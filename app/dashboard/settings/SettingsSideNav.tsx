'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SETTINGS_SECTION_IDS, type SettingsSectionId, useSettingsFocus } from './SettingsFocus'

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
  const { activeSection, setActiveSection } = useSettingsFocus()
  const clickedSection = useRef<SettingsSectionId | null>(null)
  const ignoreScrollUntil = useRef(0)

  useEffect(() => {
    const hashSection = window.location.hash.slice(1)
    if (SETTINGS_SECTION_IDS.includes(hashSection as SettingsSectionId)) {
      clickedSection.current = hashSection as SettingsSectionId
      ignoreScrollUntil.current = Date.now() + 900
      setActiveSection(hashSection as SettingsSectionId)
    }

    // rootMargin pushes the "active" band toward the top of the
    // viewport — a section is considered active as soon as it crosses
    // roughly 25% down from the top, which feels natural while
    // scrolling through a long form.
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickedSection.current) return

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const visibleSection = visible[0]?.target.id
        if (SETTINGS_SECTION_IDS.includes(visibleSection as SettingsSectionId)) {
          setActiveSection(visibleSection as SettingsSectionId)
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )

    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    // Unlock after any user scroll (wheel, touch, keyboard, scrollbar).
    // Ignore the smooth scroll that follows a nav click so focus doesn't
    // jump mid-animation.
    function unlockFocusOnScroll() {
      if (Date.now() < ignoreScrollUntil.current) return
      clickedSection.current = null
    }

    window.addEventListener('scroll', unlockFocusOnScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', unlockFocusOnScroll)
    }
  }, [setActiveSection])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: SettingsSectionId) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    clickedSection.current = id
    ignoreScrollUntil.current = Date.now() + 900
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Update the URL hash so the address bar reflects the section,
    // without the default jump that `href="#..."` would cause.
    history.replaceState(null, '', `#${id}`)
    setActiveSection(id)
  }

  return (
    <nav aria-label={t('sectionsAria')} className="flex flex-col gap-1">
      {SETTINGS_SECTIONS.map((s) => {
        const isActive = activeSection === s.id
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
