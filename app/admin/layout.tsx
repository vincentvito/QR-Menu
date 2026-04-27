import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCachedSession } from '@/lib/auth'
import { BrandMark } from '@/components/brand/BrandMark'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { AdminTabs } from './AdminTabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession()
  if (!session) redirect('/auth/login?callbackUrl=/admin')
  // Don't leak admin's existence to non-admins.
  if (session.user.role !== 'admin') notFound()

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-[clamp(20px,5vw,80px)] py-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Qtable home">
              <BrandMark size="md" />
            </Link>
            <span className="text-muted-foreground text-xs tracking-[0.14em] uppercase">
              Platform admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm">
              Your dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,80px)]">
          <AdminTabs />
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] space-y-10 px-[clamp(20px,5vw,80px)] py-6">
        {children}
      </main>
    </div>
  )
}
