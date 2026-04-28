'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import type { PlanDefinition } from '@/lib/plans'

interface StartTrialPanelProps {
  orgId: string
  plans: PlanDefinition[]
}

function formatMonthly(cents: number | null): string {
  if (cents === null) return '—'
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
}

export function StartTrialPanel({ orgId, plans }: StartTrialPanelProps) {
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)

  async function startTrial(planId: string) {
    setPendingPlan(planId)
    try {
      const result = await authClient.subscription.upgrade({
        plan: planId,
        referenceId: orgId,
        annual: false,
        successUrl: '/dashboard?welcome=trial',
        cancelUrl: '/onboarding/start-trial',
      })
      if (result.error) {
        toast.error(result.error.message ?? 'Checkout unavailable. Check your Stripe config.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setPendingPlan(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const recommended = plan.id === 'pro'
          return (
            <section
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-5 ${
                recommended ? 'border-accent shadow-sm' : 'border-cream-line'
              }`}
            >
              {recommended ? (
                <span className="bg-accent text-accent-foreground absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  Recommended
                </span>
              ) : null}

              <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatMonthly(plan.priceMonthlyCents)}
                <span className="text-muted-foreground text-sm font-normal"> /mo after trial</span>
              </p>

              <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="text-accent mt-0.5 size-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {plan.maxRestaurants} restaurant{plan.maxRestaurants === 1 ? '' : 's'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-accent mt-0.5 size-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{plan.monthlyCredits} AI credits / month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-accent mt-0.5 size-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{plan.maxMenusPerRestaurant} menus per restaurant</span>
                </li>
              </ul>

              <Button
                className="mt-5 w-full"
                onClick={() => startTrial(plan.id)}
                disabled={pendingPlan !== null}
                variant={recommended ? 'default' : 'outline'}
              >
                {pendingPlan === plan.id ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Redirecting…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    <span>Start free trial</span>
                  </>
                )}
              </Button>
            </section>
          )
        })}
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Card not charged for 14 days. Cancel any time from billing.
      </p>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Skip for now — I&apos;ll start the trial later
        </Link>
      </div>
    </div>
  )
}
