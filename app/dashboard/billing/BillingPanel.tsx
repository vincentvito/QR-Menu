'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, CreditCard, Gift, Lock, Loader2, Sparkles, Zap } from 'lucide-react'
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

const PLAN_VISUALS: Record<
  PlanDefinition['id'],
  {
    imageSrc: string
    labelKey: 'trial' | 'basic' | 'pro' | 'business' | 'enterprise'
    objectPosition: string
    overlay: string
  }
> = {
  trial: {
    imageSrc: '/images/pricing-pro-plan.png',
    labelKey: 'trial',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/92 via-[#1a1e17]/46 to-[#1a1e17]/4',
  },
  basic: {
    imageSrc: '/images/pricing-basic-plan.png',
    labelKey: 'basic',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/92 via-[#1a1e17]/50 to-[#1a1e17]/4',
  },
  pro: {
    imageSrc: '/images/pricing-pro-plan.png',
    labelKey: 'pro',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/94 via-[#1a1e17]/42 to-[#1a1e17]/4',
  },
  business: {
    imageSrc: '/images/pricing-business-plan.png',
    labelKey: 'business',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/92 via-[#1a1e17]/48 to-[#1a1e17]/4',
  },
  enterprise: {
    imageSrc: '/images/pricing-enterprise-plan.png',
    labelKey: 'enterprise',
    objectPosition: '50% 50%',
    overlay: 'from-[#1a1e17]/94 via-[#1a1e17]/52 to-[#1a1e17]/4',
  },
}

const SUBSCRIBABLE_PLANS: Array<PlanDefinition['id']> = ['basic', 'pro', 'business', 'enterprise']

function formatPrice(cents: number | null): string {
  if (cents === null) return '-'
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`
}

function formatDate(date: Date | null, locale: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type BillingTranslator = ReturnType<typeof useTranslations<'Billing'>>

function getSubscriptionSummary(
  subscription: BillingState['subscription'],
  t: BillingTranslator,
  locale: string,
): string {
  if (!subscription) return t('currentPlan.notSubscribed')

  const scheduledEnd =
    subscription.cancelAt ?? (subscription.cancelAtPeriodEnd ? subscription.periodEnd : null)
  if (scheduledEnd) {
    return t('currentPlan.cancellationScheduled', { date: formatDate(scheduledEnd, locale) })
  }

  if (subscription.periodEnd) {
    return t('currentPlan.renews', {
      status: subscription.status,
      date: formatDate(subscription.periodEnd, locale),
    })
  }

  return subscription.status
}

function getCreditCycleLabel({
  subscription,
  lastResetAt,
  scheduledCancellationDate,
  isComped,
  t,
  locale,
}: {
  subscription: BillingState['subscription']
  lastResetAt: Date | null
  scheduledCancellationDate: Date | null
  isComped: boolean
  t: BillingTranslator
  locale: string
}): string | null {
  if (scheduledCancellationDate) {
    return t('credits.availableUntil', { date: formatDate(scheduledCancellationDate, locale) })
  }

  if (!isComped && subscription?.periodEnd) {
    return t('credits.nextReset', { date: formatDate(subscription.periodEnd, locale) })
  }

  if (lastResetAt) {
    return t('credits.lastReset', { date: formatDate(lastResetAt, locale) })
  }

  return null
}

export function BillingPanel({ orgId, canManage, state, planCatalog }: BillingPanelProps) {
  const t = useTranslations('Billing')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const creditPackLabel = t('credits.packLabel')
  const [interval, setInterval] = useState<'month' | 'year'>(
    state.subscription?.billingInterval === 'year' ? 'year' : 'month',
  )
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isBuyingCredits, setIsBuyingCredits] = useState(false)
  const [isSavingActivation, setIsSavingActivation] = useState(false)
  const [activePicks, setActivePicks] = useState<Set<string>>(
    () => new Set(state.restaurants.filter((r) => !r.readOnly).map((r) => r.id)),
  )

  // Surface the Stripe redirect outcome once, then clean the URL. Ref guard
  // prevents the toast from re-firing on router.refresh() within the same nav.
  const toastHandled = useRef(false)
  useEffect(() => {
    if (toastHandled.current) return
    const creditPack = searchParams.get('creditPack')
    if (creditPack === 'success') {
      toast.success(t('credits.packPurchased', { pack: creditPackLabel }))
      toastHandled.current = true
      router.replace('/dashboard/billing')
      router.refresh()
    } else if (creditPack === 'cancel') {
      toast.info(t('credits.packCanceled'))
      toastHandled.current = true
      router.replace('/dashboard/billing')
    }
  }, [searchParams, router, t, creditPackLabel])

  const currentPlanId = state.plan.id
  const isTrialing = state.subscription?.status === 'trialing'
  const isLapsed = state.subscriptionAccess.isLapsed
  const isComped = Boolean(state.comp.plan)
  const isSetupMode = !state.subscription && !isLapsed && !isComped
  const scheduledCancellationDate =
    state.subscription?.cancelAt ??
    (state.subscription?.cancelAtPeriodEnd ? state.subscription.periodEnd : null)
  const creditCycleLabel = getCreditCycleLabel({
    subscription: state.subscription,
    lastResetAt: state.credits.resetsAt,
    scheduledCancellationDate,
    isComped,
    t,
    locale,
  })
  const displayPlanName = isComped
    ? t('currentPlan.complimentary', { plan: state.plan.name })
    : isSetupMode
      ? t('currentPlan.setupMode')
      : isLapsed && state.subscriptionAccess.latestPlan
        ? (planCatalog.find((p) => p.id === state.subscriptionAccess.latestPlan)?.name ??
          state.subscriptionAccess.latestPlan)
        : state.plan.name

  async function startUpgrade(planId: string) {
    setPendingPlan(planId)
    try {
      const result = await authClient.subscription.upgrade({
        plan: planId,
        referenceId: orgId,
        annual: interval === 'year',
        successUrl: isSetupMode
          ? '/dashboard/menus?trial=started'
          : '/dashboard/billing?checkout=success',
        cancelUrl: '/dashboard/billing?checkout=cancel',
      })
      if (result.error) {
        toast.error(result.error.message ?? t('errors.checkoutUnavailable'))
      }
      // On success the call returns a URL to redirect to; the plugin handles that.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.checkoutFailed'))
    } finally {
      setPendingPlan(null)
    }
  }

  async function buyCreditPack() {
    setIsBuyingCredits(true)
    try {
      const res = await fetch('/api/billing/credit-pack/checkout', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        toast.error(body.error ?? t('errors.checkoutStartFailed'))
        return
      }
      window.location.href = body.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errors.checkoutFailed'))
    } finally {
      setIsBuyingCredits(false)
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
          toast.error(result.error.message ?? t('errors.portalUnavailable'))
          return
        }
        if (result.data?.url) window.location.href = result.data.url
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('errors.portalFailed'))
      }
    })
  }

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
          toast.error(t('errors.activationLimit', { count: cap }))
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
        toast.error(body.error ?? t('errors.activationFailed'))
        return
      }
      toast.success(t('activation.saved'))
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
              {t('activation.title')}
            </h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('activation.description', { plan: state.plan.name, count: cap ?? 0 })}
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
                      {t('activation.readOnly')}
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
          {canManage && !isLapsed ? (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                {t('activation.picked', { picked: activePicks.size, count: cap ?? 0 })}
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
                {t('activation.save')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isLapsed ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950">
          <h2 className="text-sm font-semibold tracking-wide uppercase">{t('lapsed.title')}</h2>
          <p className="mt-2 text-sm leading-6">{t('lapsed.description')}</p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={() => {
              document
                .getElementById('plan-picker')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            {t('lapsed.cta')}
          </Button>
        </section>
      ) : null}

      {/* Current plan + credits */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="border-cream-line bg-card flex flex-col rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="text-muted-foreground size-4" aria-hidden="true" />
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {t('currentPlan.title')}
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{displayPlanName}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLapsed
              ? t('currentPlan.subscriptionEnded')
              : isSetupMode
                ? t('currentPlan.setupModeDescription')
                : getSubscriptionSummary(state.subscription, t, locale)}
          </p>
          {isSetupMode ? (
            <div className="bg-accent/10 mt-4 rounded-lg px-3 py-2 text-xs">
              <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
              {t('currentPlan.setupModeBenefit')}
            </div>
          ) : null}
          {scheduledCancellationDate && !isLapsed && !isComped ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {t('currentPlan.canceledActiveUntil', {
                date: formatDate(scheduledCancellationDate, locale),
              })}
            </div>
          ) : null}
          {isTrialing && state.subscription?.trialEnd ? (
            <div className="bg-accent/10 mt-4 rounded-lg px-3 py-2 text-xs">
              <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
              {t('currentPlan.trialEnds', {
                date: formatDate(state.subscription.trialEnd, locale),
              })}
            </div>
          ) : null}
          {isComped ? (
            <div className="bg-accent/10 mt-4 rounded-lg px-3 py-2 text-xs">
              <Gift className="mr-1 inline size-3" aria-hidden="true" />
              {state.comp.reason
                ? t('currentPlan.ownerGrantedReason', { reason: state.comp.reason })
                : t('currentPlan.ownerGranted')}
            </div>
          ) : null}
          {canManage && state.subscription && !isComped ? (
            <div className="mt-auto pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openBillingPortal}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {t('currentPlan.manageBilling')}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="border-cream-line bg-card flex flex-col rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <Zap className="text-muted-foreground size-4" aria-hidden="true" />
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {t('credits.cardTitle')}
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
            {state.credits.total}
          </p>
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <div>
              {t('credits.monthlyBucket')}:{' '}
              <span className="tabular-nums">{state.credits.monthly}</span>
              {state.plan.monthlyCredits !== null ? (
                <span className="tabular-nums">
                  {' '}
                  {t('credits.monthlyOf', { count: state.plan.monthlyCredits })}
                </span>
              ) : null}
            </div>
            <div>
              {t('credits.bonus')}: <span className="tabular-nums">{state.credits.bonus}</span>
            </div>
            {creditCycleLabel ? <div>{creditCycleLabel}</div> : null}
          </div>
          {canManage && !isLapsed && !isSetupMode ? (
            <div className="mt-auto pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={buyCreditPack}
                disabled={isBuyingCredits}
              >
                {isBuyingCredits ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {t('credits.buyPack', { pack: creditPackLabel })}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      {/* Plan picker */}
      <section
        id="plan-picker"
        className="border-cream-line bg-card scroll-mt-24 rounded-2xl border p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {isLapsed
              ? t('planPicker.chooseToContinue')
              : isSetupMode
                ? t('planPicker.startTrialTitle')
                : state.subscription
                  ? t('planPicker.changePlan')
                  : t('planPicker.choosePlan')}
          </h2>
          <div className="border-cream-line inline-flex rounded-full border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                interval === 'month' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              {t('planPicker.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                interval === 'year' ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              {t('planPicker.yearly')}
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
              const visual = PLAN_VISUALS[p.id]
              return (
                <div
                  key={p.id}
                  className={`group bg-background relative flex min-h-[310px] flex-col overflow-hidden rounded-[20px] border shadow-[0_14px_36px_-32px_rgba(26,30,23,0.5)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                    isCurrent ? 'border-foreground' : 'border-cream-line'
                  }`}
                >
                  {isCurrent ? (
                    <span className="bg-foreground text-background absolute top-3 left-3 z-20 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                      {t('planPicker.current')}
                    </span>
                  ) : null}
                  <div className="relative h-24 overflow-hidden">
                    <Image
                      src={visual.imageSrc}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 220px"
                      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      style={{ objectPosition: visual.objectPosition }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${visual.overlay}`} />
                    <div className="text-background absolute right-3 bottom-3 left-3 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-background/70 text-[10px] font-semibold tracking-[0.1em] uppercase">
                          {t(`visuals.${visual.labelKey}`)}
                        </div>
                        <h3 className="mt-0.5 text-base leading-none font-semibold">{p.name}</h3>
                      </div>
                      <div className="bg-background/14 border-background/20 grid size-8 place-items-center rounded-full border backdrop-blur">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">
                      {isEnterprise && interval === 'year' ? (
                        <span className="text-muted-foreground text-base font-normal">
                          {t('planPicker.custom')}
                        </span>
                      ) : (
                        <>
                          {formatPrice(priceCents)}
                          <span className="text-muted-foreground text-xs font-normal">
                            {' '}
                            /
                            {interval === 'year'
                              ? t('planPicker.perYear')
                              : t('planPicker.perMonth')}
                          </span>
                        </>
                      )}
                    </p>
                    <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
                      <li className="flex items-center gap-1.5">
                        <Check className="text-accent-deep size-3" aria-hidden="true" />
                        {p.maxRestaurants === null
                          ? t('planFeatures.sixPlusRestaurants')
                          : t('planFeatures.restaurants', { count: p.maxRestaurants })}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="text-accent-deep size-3" aria-hidden="true" />
                        {t('planFeatures.menusEach', { count: p.maxMenusPerRestaurant })}
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="text-accent-deep size-3" aria-hidden="true" />
                        {p.monthlyCredits === null
                          ? t('planFeatures.customAiAllowance')
                          : t('planFeatures.aiCreditsPerMonth', { count: p.monthlyCredits })}
                      </li>
                    </ul>
                    {canManage && !isCurrent && !isComped ? (
                      <Button
                        size="sm"
                        className="mt-auto w-full"
                        onClick={() => startUpgrade(p.id)}
                        disabled={pendingPlan !== null || (isEnterprise && interval === 'year')}
                      >
                        {pendingPlan === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : isEnterprise ? (
                          t('planPicker.contactSales')
                        ) : state.subscription ? (
                          t('planPicker.switchPlan')
                        ) : (
                          t('planPicker.startTrial')
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
        </div>

        <p className="text-muted-foreground mt-4 text-xs">
          {t('usage', {
            active: state.usage.restaurantCount,
            max: state.plan.maxRestaurants === null ? '∞' : state.plan.maxRestaurants,
            count: state.plan.maxRestaurants ?? 2,
          })}
        </p>
      </section>
    </div>
  )
}
