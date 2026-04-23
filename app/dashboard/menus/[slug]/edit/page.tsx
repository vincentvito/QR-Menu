import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getMenuBySlug } from '@/lib/menus/get'
import { getDashboardContext } from '@/lib/dashboard/context'
import { Button } from '@/components/ui/button'
import { MenuEditor } from '@/components/editor/MenuEditor'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditMenuPage({ params }: PageProps) {
  // getDashboardContext handles session + redirect logic and is cached per
  // request alongside the layout call, so this is free.
  const [{ session }, { slug }, t] = await Promise.all([
    getDashboardContext(),
    params,
    getTranslations('Editor'),
  ])

  const menu = await getMenuBySlug(slug)
  if (!menu) notFound()

  // Don't leak existence of menus in orgs the user doesn't belong to.
  const membership = await prisma.member.findFirst({
    where: { organizationId: menu.organizationId, userId: session.user.id },
    select: { id: true },
  })
  if (!membership) notFound()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/menus"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          {t('back')}
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/m/${slug}`} target="_blank" rel="noopener">
            {t('viewPublic')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <MenuEditor
        slug={slug}
        initial={{
          name: menu.name,
          currency: menu.restaurant?.currency ?? 'USD',
          items: menu.items.map((i) => ({
            id: i.id,
            category: i.category,
            name: i.name,
            description: i.description,
            price: i.price,
            tags: i.tags,
            badges: i.badges,
            specialUntil: i.specialUntil ? i.specialUntil.toISOString() : null,
            imageUrl: i.imageUrl,
          })),
        }}
      />
    </main>
  )
}
