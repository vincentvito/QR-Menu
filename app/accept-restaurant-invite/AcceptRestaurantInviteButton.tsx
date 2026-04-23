'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function AcceptRestaurantInviteButton({ token }: { token: string }) {
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
        toast.error(body.error ?? 'Could not accept invitation')
        setAccepting(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
      setAccepting(false)
    }
  }

  return (
    <Button onClick={accept} disabled={accepting} size="lg" className="w-full">
      {accepting ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Accepting…</span>
        </>
      ) : (
        <span>Accept invitation</span>
      )}
    </Button>
  )
}
