// Single source of truth for pricing, plan caps, and credit allowances.
// Everything that gates behavior (can the user create another restaurant?
// can they run an AI action?) resolves through this file so a pricing
// tweak is one edit, not a manhunt.

export type PlanId = 'trial' | 'basic' | 'pro' | 'business' | 'enterprise'

export interface PlanDefinition {
  id: PlanId
  name: string
  // Monthly / yearly prices in USD cents. null = no fixed price:
  //   - trial has no price (card captured, charged later)
  //   - enterprise yearly is negotiated per customer
  priceMonthlyCents: number | null
  priceYearlyCents: number | null
  // null maxRestaurants = unlimited (enterprise, with optional override cap).
  maxRestaurants: number | null
  maxMenusPerRestaurant: number
  // null monthlyCredits = custom for the org (enterprise uses its override).
  monthlyCredits: number | null
  // One-time credit grant when the trial starts (after card capture).
  trialCredits?: number
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    priceMonthlyCents: null,
    priceYearlyCents: null,
    maxRestaurants: 1,
    maxMenusPerRestaurant: 5,
    monthlyCredits: null,
    trialCredits: 5,
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    priceMonthlyCents: 1400,
    priceYearlyCents: 13500,
    maxRestaurants: 1,
    maxMenusPerRestaurant: 5,
    monthlyCredits: 30,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthlyCents: 2900,
    priceYearlyCents: 27900,
    maxRestaurants: 3,
    maxMenusPerRestaurant: 5,
    monthlyCredits: 80,
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthlyCents: 6900,
    priceYearlyCents: 66500,
    maxRestaurants: 5,
    maxMenusPerRestaurant: 5,
    monthlyCredits: 250,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthlyCents: 14900,
    priceYearlyCents: null,
    maxRestaurants: null,
    maxMenusPerRestaurant: 5,
    monthlyCredits: null,
  },
}

export const CREDIT_PACK = {
  priceCents: 1500,
  credits: 100,
} as const

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS
}

// Merge the base plan definition with any per-org overrides. The plugin's
// Subscription row carries the plan name; the Organization row carries the
// enterprise override caps (since the plugin doesn't manage those fields).
// Passing null for either falls back to the trial plan with no overrides —
// safest read for "not paying yet."
export function resolvePlan(
  subscription: { plan: string } | null,
  overrides?: {
    maxRestaurantsOverride?: number | null
    monthlyCreditsOverride?: number | null
    compPlan?: string | null
  } | null,
): PlanDefinition {
  const planId: PlanId = isPlanId(overrides?.compPlan)
    ? (overrides.compPlan as PlanId)
    : isPlanId(subscription?.plan)
      ? (subscription.plan as PlanId)
      : 'trial'
  const base = PLANS[planId]
  return {
    ...base,
    maxRestaurants: overrides?.maxRestaurantsOverride ?? base.maxRestaurants,
    monthlyCredits: overrides?.monthlyCreditsOverride ?? base.monthlyCredits,
  }
}
