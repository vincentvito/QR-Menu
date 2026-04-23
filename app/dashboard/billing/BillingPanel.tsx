'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, CreditCard, Lock, Loader2, Sparkles, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import type { BillingState } from '@/lib/plans/billing-state'
import type { PlanDefinition } from '@/lib/plans'

interface BillingPanelProps {
  orgId: string
  canManage: boolean
  state: BillingState
  planCatalog: PlanDefinition[]
}

const SUBSCRIBABLE_PLANS: Array<PlanDefinition['id']> = ['basic', 'pro', 'business', 'enterprise']

function formatPrice(cents: number | null): string {
  if (cents === null) return '—'
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BillingPanel({ orgId, canManage, state, planCatalog }: BillingPanelProps) {
  const router = useRouter()
  const [interval, setInterval] = useState<'month' | 'year'>(
    state.subscription?.billingInterval === 'year' ? 'year' : 'month',
  )
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSavingActivation, setIsSavingActivation] = useState(false)
  const [activePicks, setActivePicks] = useState<Set<string>>(
    () => new Set(state.restaurants.filter((r) => !r.readOnly).map((r) => r.id)),
  )

  const currentPlanId = state.plan.id
  const isTrialing = state.subscription?.status === 'trialing'

  async function startUpgrade(planId: string) {
    setPendingPlan(planId)
    try {
      const result = await authClient.subscription.upgrade({
        plan: planId,
        referenceId: orgId,
        annual: interval === 'year',
        successUrl: '/dashboard/billing?checkout=success',
        cancelUrl: '/dashboard/billing?checkout=cancel',
      })
      if (result.error) {
        toast.error(result.error.message ?? 'Checkout unavailable. Check your Stripe config.')
      }
      // On success the call returns a URL to redirect to — the plugin handles that.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setPendingPlan(null)
    }
  }

  async function openBillingPortal() {
    startTransition(async () => {
      try {
        const result = await authClient.subscription.billingPortal({
          referenceId: orgId,
          returnUrl: '/dashboard/billing',
        })
        if (result.error) {
          toast.error(result.error.message ?? 'Portal unavailable')
          return
        }
        if (result.data?.url) window.location.href = result.data.url
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Portal failed')
      }
    })
  }

  const totalCreditLimit =
    state.plan.monthlyCredits !== null ? state.plan.monthlyCredits : null

  const cap = state.plan.maxRestaurants
  const hasReadOnly = state.restaurants.some((r) => r.readOnly)
  const showActivationPicker = hasReadOnly && cap !== null

  function toggleActive(id: string) {
    setActivePicks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (cap !== null && next.size >= cap) {
          toast.error(`Your plan only allows ${cap} active restaurant${cap === 1 ? '' : 's'}.`)
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  async function saveActivation() {
    setIsSavingActivation(true)
    try {
      const res = await fetch('/api/restaurants/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeIds: [...activePicks] }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Could not update activation')
        return
      }
      toast.success('Activation updated')
      router.refresh()
    } finally {
      setIsSavingActivation(false)
    }
  }

  const activationDirty =
    state.restaurants.filter((r) => !r.readOnly).length !== activePicks.size ||
    state.restaurants.some((r) => !r.readOnly && !activePicks.has(r.id)) ||
    state.restaurants.some((r) => r.readOnly && activePicks.has(r.id))

  return (
    <div className="space-y-6">
      {/* Activation picker — only shown when the plan cap has frozen at
          least one restaurant into readOnly. Lets the user pick a different
          subset to activate (e.g. swap which venue stays live) without
          upgrading. */}
      {showActivationPicker ? (
        <section className="border-accent bg-accent/5 rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <Lock className="text-accent size-4" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              Some restaurants are read-only
            </h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Your {state.plan.name} plan allows {cap} active restaurant{cap === 1 ? '' : 's'}.
            Frozen ones still serve their public menus, but their dashboards are view-only
            until you re-activate them or upgrade.
          </p>
          <div className="mt-4 space-y-2">
            {state.restaurants.map((r) => {
              const checked = activePicks.has(r.id)
              return (
                <label
                  key={r.id}
                  className="border-cream-line bg-background flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleActive(r.id)}
                    disabled={!canManage || isSavingActivation}
                    className="size-4"
                  />
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  {!checked ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Lock className="size-3" aria-hidden="true" />
                      Read-only
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
          {canManage ? (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {activePicks.size} of {cap} slot{cap === 1 ? '' : 's'} picked
              </span>
              <Button
                size="sm"
                className="ml-auto"
                onClick={saveActivation}
                disabled={!activationDirty || isSavingActivation}
              >
                {isSavingActivation ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Save activation
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Current plan + credits */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="text-muted-foreground size-4" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Current plan
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{state.plan.name}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {state.subscription ? (
              <>
                {state.subscription.status}
                {state.subscription.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
                {state.subscription.periodEnd ? ` · renews ${formatDate(state.subscription.periodEnd)}` : ''}
              </>
            ) : (
              'Not subscribed yet'
            )}
          </p>
          {isTrialing && state.subscription?.trialEnd ? (
            <div className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs">
              <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
              Trial ends {formatDate(state.subscription.trialEnd)}
            </div>
          ) : null}
          {canManage && state.subscription ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={openBillingPortal}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Manage billing
            </Button>
          ) : null}
        </section>

        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <Zap className="text-muted-foreground size-4" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              AI credits
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
            {state.credits.total}
            {totalCreditLimit !== null ? (
              <span className="text-muted-foreground text-base font-normal">
                {' '}/ {totalCreditLimit} this month
              </span>
            ) : null}
          </p>
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <div>Monthly bucket: <span className="tabular-nums">{state.credits.monthly}</span></div>
            <div>
              Bonus (never expire): <span className="tabular-nums">{state.credits.bonus}</span>
            </div>
            {state.credits.resetsAt ? (
              <div>Resets {formatDate(state.credits.resetsAt)}</div>
            ) : null}
          </div>
          {canManage ? (
            <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
              Buy 100 credits · $15 (coming soon)
            </Button>
          ) : null}
        </section>
      </div>

      {/* Plan picker */}
      <section className="border-cream-line bg-card rounded-2xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {state.subscription ? 'Change plan' : 'Choose a plan'}
          </h2>
          <div className="border-cream-line inline-flex rounded-full border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                interval === 'month' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                interval === 'year' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {planCatalog
            .filter((p) => SUBSCRIBABLE_PLANS.includes(p.id))
            .map((p) => {
              const priceCents = interval === 'year' ? p.priceYearlyCents : p.priceMonthlyCents
              const isCurrent = p.id === currentPlanId
              const isEnterprise = p.id === 'enterprise'
              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl border p-4 ${
                    isCurrent ? 'border-foreground' : 'border-cream-line'
                  }`}
                >
                  {isCurrent ? (
                    <span className="bg-foreground text-background absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                      Current
                    </span>
                  ) : null}
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                    {isEnterprise && interval === 'year' ? (
                      <span className="text-muted-foreground text-base font-normal">Custom</span>
                    ) : (
                      <>
                        {formatPrice(priceCents)}
                        <span className="text-muted-foreground text-xs font-normal">
                          {' '}/{interval === 'year' ? 'yr' : 'mo'}
                        </span>
                      </>
                    )}
                  </p>
                  <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3" aria-hidden="true" />
                      {p.maxRestaurants === null
                        ? '6+ restaurants'
                        : `${p.maxRestaurants} restaurant${p.maxRestaurants === 1 ? '' : 's'}`}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3" aria-hidden="true" />
                      {p.maxMenusPerRestaurant} menus each
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="size-3" aria-hidden="true" />
                      {p.monthlyCredits === null
                        ? 'Custom AI allowance'
                        : `${p.monthlyCredits} AI credits/mo`}
                    </li>
                  </ul>
                  {canManage && !isCurrent ? (
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => startUpgrade(p.id)}
                      disabled={pendingPlan !== null || (isEnterprise && interval === 'year')}
                    >
                      {pendingPlan === p.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : isEnterprise ? (
                        'Contact sales'
                      ) : state.subscription ? (
                        'Switch to this plan'
                      ) : (
                        'Start 14-day trial'
                      )}
                    </Button>
                  ) : null}
                </div>
              )
            })}
        </div>

        <p className="text-muted-foreground mt-4 text-xs">
          You're using {state.usage.restaurantCount} of{' '}
          {state.plan.maxRestaurants === null ? '∞' : state.plan.maxRestaurants} restaurant
          {state.plan.maxRestaurants === 1 ? '' : 's'} on your current plan.
        </p>
      </section>
    </div>
  )
}
