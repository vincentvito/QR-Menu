'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const t = useTranslations('Dashboard')
  const router = useRouter()

  return (
    <Button
      onClick={async () => {
        await signOut()
        router.push('/auth/login')
      }}
      variant="outline"
      size="sm"
    >
      {t('signOut')}
    </Button>
  )
}
