'use client'

import { ViewTransition } from 'react'
import { usePathname } from 'next/navigation'

interface RouteViewTransitionProps {
  children: React.ReactNode
}

export function RouteViewTransition({ children }: RouteViewTransitionProps) {
  const pathname = usePathname()

  return (
    <ViewTransition
      key={pathname}
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'fade-in' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'fade-out' }}
      default="none"
    >
      <div className="min-w-0">{children}</div>
    </ViewTransition>
  )
}
