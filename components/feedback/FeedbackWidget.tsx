'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const SCRIPT_URL =
  'https://feedbackbasket.com/api/widget/script/cmomyt54l000004i8h877ra0i'

export function FeedbackWidget() {
  const pathname = usePathname()
  if (pathname?.startsWith('/m/')) return null
  return <Script src={SCRIPT_URL} strategy="lazyOnload" />
}
