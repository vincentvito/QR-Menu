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
  { id: 'settings-danger', labelKey: 'danger' },
] as const

// Sticky left-hand quick-nav for the Settings page. Clicking a label
// smooth-scrolls the section into view with an offset that clears the
// dashboard's sticky header. Scroll-spy highlights whichever section is
// currently under the top of the viewport.
export function SettingsSideNav({ showDanger }: { showDanger: boolean }) {
  const t = useTranslations('Settings')
  const { activeSection, setActiveSection } = useSettingsFocus()
  const clickedSection = useRef<SettingsSectionId | null>(null)
  const unlockTimer = useRef<number | null>(null)

  useEffect(() => {
    const hashSection = window.location.hash.slice(1)
    if (
      SETTINGS_SECTION_IDS.includes(hashSection as SettingsSectionId) &&
      (hashSection !== 'settings-danger' || showDanger)
    ) {
      clickedSection.current = hashSection as SettingsSectionId
      unlockTimer.current = window.setTimeout(() => {
        clickedSection.current = null
      }, 900)
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
      if (section.id === 'settings-danger' && !showDanger) continue
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    function updateFocusAtPageEnd() {
      if (clickedSection.current || !showDanger) return

      const atPageEnd =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (atPageEnd) setActiveSection('settings-danger')
    }

    window.addEventListener('scroll', updateFocusAtPageEnd, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateFocusAtPageEnd)
      if (unlockTimer.current) window.clearTimeout(unlockTimer.current)
    }
  }, [setActiveSection, showDanger])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: SettingsSectionId) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    clickedSection.current = id
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current)
    unlockTimer.current = window.setTimeout(() => {
      clickedSection.current = null
    }, 900)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Update the URL hash so the address bar reflects the section,
    // without the default jump that `href="#..."` would cause.
    history.replaceState(null, '', `#${id}`)
    setActiveSection(id)
  }

  return (
    <nav aria-label={t('sectionsAria')} className="flex flex-col gap-1">
      {SETTINGS_SECTIONS.filter((section) => showDanger || section.id !== 'settings-danger').map(
        (s) => {
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
        },
      )}
    </nav>
  )
}
