'use client'

import { createContext, useContext, useState } from 'react'

export const SETTINGS_SECTION_IDS = [
  'settings-restaurant',
  'settings-links',
  'settings-menu-design',
  'settings-brand',
  'settings-qr',
  'settings-wifi',
  'settings-analytics-reports',
  'settings-danger',
] as const

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number]

interface SettingsFocusContextValue {
  activeSection: SettingsSectionId
  setActiveSection: (section: SettingsSectionId) => void
}

const SettingsFocusContext = createContext<SettingsFocusContextValue | null>(null)

export function SettingsFocusProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('settings-restaurant')

  return (
    <SettingsFocusContext value={{ activeSection, setActiveSection }}>
      {children}
    </SettingsFocusContext>
  )
}

export function useSettingsFocus() {
  const context = useContext(SettingsFocusContext)

  if (!context) {
    throw new Error('useSettingsFocus must be used within SettingsFocusProvider')
  }

  return context
}

export function settingsSectionFocusClass(isActive: boolean) {
  return [
    'relative isolate transition-[opacity,filter,box-shadow] duration-300 ease-out',
    'motion-reduce:transition-none',
    'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]',
    'after:bg-foreground/[0.055] after:transition-opacity after:duration-300 after:ease-out',
    'after:motion-reduce:transition-none',
    isActive
      ? 'z-10 ring-1 ring-foreground/15 shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_10%,transparent),0_20px_55px_-28px_color-mix(in_oklab,var(--foreground)_50%,transparent),0_0_36px_-22px_color-mix(in_oklab,var(--foreground)_35%,transparent)] after:opacity-0'
      : 'opacity-60 brightness-[0.92] after:opacity-100 hover:opacity-75',
  ].join(' ')
}
