import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getMenuBySlug } from '@/lib/menus/get'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { MenuEditor } from '@/components/editor/MenuEditor'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditMenuPage({ params }: PageProps) {
  // Session, params, and translations are all independent — parallelize.
  const [session, { slug }, t] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    params,
    getTranslations('Editor'),
  ])
  if (!session) redirect('/auth/login')

  const menu = await getMenuBySlug(slug)
  if (!menu) notFound()

  // Access check: user must be a member of the menu's organization.
  // Don't leak existence of menus in orgs the user doesn't belong to.
  const membership = await prisma.member.findFirst({
    where: { organizationId: menu.organizationId, userId: session.user.id },
    select: { id: true },
  })
  if (!membership) notFound()

  return (
    <div className="min-h-screen">
      <header className="border-cream-line bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-[clamp(20px,5vw,80px)] py-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="QRmenucrafter home">
              <BrandMark size="md" />
            </Link>
            <Link
              href="/dashboard/menus"
              className="text-muted-foreground hover:text-foreground hidden items-center gap-1 text-sm sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('back')}
            </Link>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/m/${slug}`} target="_blank" rel="noopener">
              {t('viewPublic')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-[clamp(20px,5vw,80px)] py-10">
        <MenuEditor
          slug={slug}
          initial={{
            name: menu.name,
            currency: menu.organization.currency,
            items: menu.items.map((i) => ({
              id: i.id,
              category: i.category,
              name: i.name,
              description: i.description,
              price: i.price,
              tags: i.tags,
            })),
          }}
        />
      </main>
    </div>
  )
}
