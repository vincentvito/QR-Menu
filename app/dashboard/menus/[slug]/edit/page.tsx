import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getMenuBySlug } from '@/lib/menus/get'
import { parseCategoryIconOverrides } from '@/lib/menus/category-icon'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getBillingState } from '@/lib/plans/billing-state'
import { Button } from '@/components/ui/button'
import { MenuEditor } from '@/components/editor/MenuEditor'
import { TransitionLink } from '@/components/navigation/TransitionLink'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditMenuPage({ params }: PageProps) {
  // getDashboardContext handles session + redirect logic and is cached per
  // request alongside the layout call, so this is free.
  const [{ session, restaurant }, { slug }, t] = await Promise.all([
    getDashboardContext(),
    params,
    getTranslations('Editor'),
  ])

  const menu = await getMenuBySlug(slug)
  if (!menu) notFound()

  // Don't leak existence of menus the user can't access. Access is granted
  // via org Member *or* RestaurantMember of this menu's restaurant — the
  // latter is how restaurant-scoped staff get in.
  const [orgMember, restaurantMember, billingState] = await Promise.all([
    prisma.member.findFirst({
      where: { organizationId: menu.organizationId, userId: session.user.id },
      select: { id: true },
    }),
    menu.restaurantId
      ? prisma.restaurantMember.findFirst({
          where: { restaurantId: menu.restaurantId, userId: session.user.id },
          select: { id: true },
        })
      : Promise.resolve(null),
    getBillingState(menu.organizationId),
  ])
  if (!orgMember && !restaurantMember) notFound()

  // Menus live under a restaurant, not just an org. If the user switched
  // restaurants while on this URL, bounce them back to the list so they
  // don't edit a menu belonging to a different venue than the one their
  // dashboard is currently scoped to.
  if (menu.restaurantId !== restaurant.id) redirect('/dashboard/menus')

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <TransitionLink
          href="/dashboard/menus"
          transitionType="nav-back"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          {t('back')}
        </TransitionLink>
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
          aiCreditsTotal: billingState.credits.total,
          readOnlyReason: billingState.subscriptionAccess.isLapsed
            ? 'Your subscription has ended. Public menus stay live, but editing is paused until you pick a plan.'
            : menu.restaurant?.readOnly
              ? 'This restaurant is read-only under your current plan.'
              : null,
          categoryIcons: parseCategoryIconOverrides(menu.categoryIcons),
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
