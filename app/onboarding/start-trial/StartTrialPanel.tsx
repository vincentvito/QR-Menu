'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import type { PlanDefinition } from '@/lib/plans'

interface StartTrialPanelProps {
  orgId: string
  plans: PlanDefinition[]
}

const PLAN_VISUALS: Record<
  string,
  {
    imageSrc: string
    label: string
    objectPosition: string
    overlay: string
  }
> = {
  basic: {
    imageSrc: '/images/pricing-basic-plan.png',
    label: 'Solo menu',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/92 via-[#1a1e17]/48 to-[#1a1e17]/4',
  },
  pro: {
    imageSrc: '/images/pricing-pro-plan.png',
    label: 'Most popular',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/94 via-[#1a1e17]/42 to-[#1a1e17]/4',
  },
  business: {
    imageSrc: '/images/pricing-business-plan.png',
    label: 'Multi-location',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/92 via-[#1a1e17]/48 to-[#1a1e17]/4',
  },
}

function formatMonthly(cents: number | null): string {
  if (cents === null) return '-'
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
}

export function StartTrialPanel({ orgId, plans }: StartTrialPanelProps) {
  const t = useTranslations('StartTrial')
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
        toast.error(result.error.message ?? t('errors.checkoutUnavailable'))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.checkoutFailed'))
    } finally {
      setPendingPlan(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const recommended = plan.id === 'pro'
          const visual = PLAN_VISUALS[plan.id] ?? PLAN_VISUALS.basic

          return (
            <section
              key={plan.id}
              className={`group bg-card relative flex min-h-[430px] flex-col overflow-hidden rounded-[28px] border shadow-[0_18px_50px_-42px_rgba(26,30,23,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${
                recommended ? 'border-accent' : 'border-cream-line'
              }`}
            >
              {recommended ? (
                <span className="bg-accent text-accent-foreground absolute top-3 right-3 z-20 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {t('recommended')}
                </span>
              ) : null}

              <div className="relative h-36 overflow-hidden">
                <Image
                  src={visual.imageSrc}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  style={{ objectPosition: visual.objectPosition }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${visual.overlay}`} />
                <div className="text-background absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-background/72 text-[11px] font-semibold tracking-[0.1em] uppercase">
                      {t(`visuals.${plan.id}`)}
                    </div>
                    <h2 className="mt-1 text-xl leading-tight font-semibold tracking-tight">
                      {plan.name}
                    </h2>
                  </div>
                  <div className="bg-background/14 border-background/20 grid size-9 place-items-center rounded-full border backdrop-blur">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMonthly(plan.priceMonthlyCents)}
                  <span className="text-muted-foreground text-sm font-normal">
                    {' '}
                    {t('afterTrial')}
                  </span>
                </p>

                <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-accent-deep mt-0.5 size-3.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t('features.restaurants', { count: plan.maxRestaurants ?? 0 })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-accent-deep mt-0.5 size-3.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t('features.aiCredits', { count: plan.monthlyCredits ?? 0 })}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-accent-deep mt-0.5 size-3.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t('features.menus', { count: plan.maxMenusPerRestaurant })}</span>
                  </li>
                </ul>

                <Button
                  className="mt-auto w-full"
                  onClick={() => startTrial(plan.id)}
                  disabled={pendingPlan !== null}
                  variant={recommended ? 'default' : 'outline'}
                >
                  {pendingPlan === plan.id ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <span>{t('redirecting')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" aria-hidden="true" />
                      <span>{t('start')}</span>
                    </>
                  )}
                </Button>
              </div>
            </section>
          )
        })}
      </div>

      <p className="text-muted-foreground text-center text-xs">{t('finePrint')}</p>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          {t('skip')}
        </Link>
      </div>
    </div>
  )
}
