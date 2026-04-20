'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

interface ImpersonationBannerProps {
  impersonatedEmail: string
}

export function ImpersonationBanner({ impersonatedEmail }: ImpersonationBannerProps) {
  const router = useRouter()
  const [stopping, setStopping] = useState(false)

  async function stop() {
    setStopping(true)
    try {
      await authClient.admin.stopImpersonating()
      router.push('/admin')
      router.refresh()
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="bg-foreground text-background sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-xs">
      <Eye className="size-3.5" aria-hidden="true" />
      <span>
        Impersonating <strong>{impersonatedEmail}</strong>
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-background hover:bg-background/10 h-6 border-white/30 bg-transparent px-2 text-[11px]"
        disabled={stopping}
        onClick={stop}
      >
        {stopping ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
        Stop
      </Button>
    </div>
  )
}
