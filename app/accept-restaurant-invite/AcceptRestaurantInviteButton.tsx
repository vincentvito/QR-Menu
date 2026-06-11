'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function AcceptRestaurantInviteButton({ token }: { token: string }) {
  const t = useTranslations('Invite')
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)

  async function accept() {
    setAccepting(true)
    try {
      const res = await fetch('/api/restaurant-invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? t('errors.acceptFailed'))
        setAccepting(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error(t('errors.network'))
      setAccepting(false)
    }
  }

  return (
    <Button onClick={accept} disabled={accepting} size="lg" className="w-full">
      {accepting ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>{t('accepting')}</span>
        </>
      ) : (
        <span>{t('accept')}</span>
      )}
    </Button>
  )
}
