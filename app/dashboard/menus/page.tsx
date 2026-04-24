import Link from 'next/link'
import { Plus, QrCode } from 'lucide-react'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getMenusForRestaurant } from '@/lib/menus/get'
import { Button } from '@/components/ui/button'
import { MenuList } from '@/components/dashboard/MenuList'

export default async function MenusPage() {
  // Cached in getDashboardContext — the layout already resolved this, so
  // this call is a same-request cache hit, not a new round-trip.
  const { restaurant } = await getDashboardContext()
  const menus = await getMenusForRestaurant(restaurant.id)
  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Menus</h1>
        <Button asChild size="sm">
          <Link href="/dashboard/menus/new">
            <Plus className="size-4" aria-hidden="true" />
            <span>New menu</span>
          </Link>
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="border-cream-line bg-card flex flex-col items-center justify-center rounded-[24px] border px-8 py-16 text-center">
          <div className="border-cream-line bg-background text-muted-foreground mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.02em]">No menus yet</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            Create your first menu from a URL, photo, PDF, or pasted text.
          </p>
          <Button asChild className="mt-5" size="sm">
            <Link href="/dashboard/menus/new">
              <Plus className="size-4" aria-hidden="true" />
              <span>New menu</span>
            </Link>
          </Button>
        </div>
      ) : (
        <MenuList
          menus={menus.map((m) => ({
            id: m.id,
            slug: m.slug,
            name: m.name,
            createdAt: m.createdAt,
            itemCount: m._count.items,
          }))}
          publicBaseUrl={publicBaseUrl}
        />
      )}
    </main>
  )
}
