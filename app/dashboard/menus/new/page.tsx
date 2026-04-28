import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'
import { NewMenuForm } from '@/components/dashboard/NewMenuForm'

export default async function NewMenuPage() {
  const { restaurant } = await getDashboardContext()
  const subscriptionAccess = await getSubscriptionAccessState(restaurant.organizationId)
  const readOnlyReason = subscriptionAccess.isLapsed
    ? 'Your subscription has ended. Public menus stay live, but creating new menus is paused until you pick a plan.'
    : restaurant.readOnly
      ? 'This restaurant is read-only under your current plan.'
      : null

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/menus"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        Back to menus
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New menu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Import from a URL, photo, PDF, or pasted text.
        </p>
      </div>

      {readOnlyReason ? (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-950">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold tracking-tight">Creating menus is paused</h2>
              <p className="mt-1 text-sm leading-6">{readOnlyReason}</p>
              <Link
                href="/dashboard/billing"
                className="mt-4 inline-flex rounded-full border border-red-300 px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-red-100"
              >
                Pick a plan
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <NewMenuForm />
      )}
    </main>
  )
}
