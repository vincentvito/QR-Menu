'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function AcceptInviteButton({ invitationId }: { invitationId: string }) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)

  async function accept() {
    setAccepting(true)
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId })
      if (res.error) {
        toast.error(res.error.message ?? 'Could not accept invitation')
        setAccepting(false)
        return
      }
      // Make the newly joined org active so the dashboard renders its context.
      const orgId = res.data?.invitation?.organizationId
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId })
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
