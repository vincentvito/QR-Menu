import type { Prisma } from '@/lib/generated/prisma/client'
import prisma from '@/lib/prisma'
import { resolvePlan } from '@/lib/plans'

export class InsufficientCreditsError extends Error {
  constructor(
    public available: number,
    public requested: number,
  ) {
    super(`Insufficient credits: have ${available}, need ${requested}`)
    this.name = 'InsufficientCreditsError'
  }
}

export interface SpendResult {
  spent: number
  fromMonthly: number
  fromBonus: number
  newMonthly: number
  newBonus: number
}

const MAX_TRANSACTION_ATTEMPTS = 3

function isTransactionConflict(error: unknown): boolean {
  return (error as { code?: unknown })?.code === 'P2034'
}

async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === MAX_TRANSACTION_ATTEMPTS) throw error
    }
  }
  throw new Error('Credit transaction retry limit exceeded')
}

const COMP_MONTH_MS = 30 * 24 * 60 * 60 * 1000

export interface CreditBalances {
  monthly: number
  bonus: number
  total: number
  resetsAt: Date | null
}

// Comped organizations do not receive Stripe renewal webhooks. Refill their
// monthly bucket lazily whenever billing or AI-credit code reads the balance.
export async function ensureCompMonthlyCredits(
  organizationId: string,
): Promise<CreditBalances | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      compPlan: true,
      maxRestaurantsOverride: true,
      monthlyCreditsOverride: true,
      monthlyCreditsRemaining: true,
      monthlyCreditsResetAt: true,
      bonusCreditsRemaining: true,
    },
  })
  if (!org) return null

  if (!org.compPlan) {
    return {
      monthly: org.monthlyCreditsRemaining,
      bonus: org.bonusCreditsRemaining,
      total: org.monthlyCreditsRemaining + org.bonusCreditsRemaining,
      resetsAt: org.monthlyCreditsResetAt,
    }
  }

  const plan = resolvePlan(null, org)
  const amount = plan.monthlyCredits ?? 0
  if (amount <= 0) {
    return {
      monthly: org.monthlyCreditsRemaining,
      bonus: org.bonusCreditsRemaining,
      total: org.monthlyCreditsRemaining + org.bonusCreditsRemaining,
      resetsAt: org.monthlyCreditsResetAt,
    }
  }

  const now = new Date()
  const shouldReset =
    !org.monthlyCreditsResetAt ||
    now.getTime() - org.monthlyCreditsResetAt.getTime() >= COMP_MONTH_MS
  if (!shouldReset) {
    return {
      monthly: org.monthlyCreditsRemaining,
      bonus: org.bonusCreditsRemaining,
      total: org.monthlyCreditsRemaining + org.bonusCreditsRemaining,
      resetsAt: org.monthlyCreditsResetAt,
    }
  }

  const staleBefore = new Date(now.getTime() - COMP_MONTH_MS)

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const result = await tx.organization.updateMany({
          where: {
            id: organizationId,
            OR: [{ monthlyCreditsResetAt: null }, { monthlyCreditsResetAt: { lt: staleBefore } }],
          },
          data: {
            monthlyCreditsRemaining: amount,
            monthlyCreditsResetAt: now,
          },
        })

        const current = await tx.organization.findUnique({
          where: { id: organizationId },
          select: {
            monthlyCreditsRemaining: true,
            bonusCreditsRemaining: true,
            monthlyCreditsResetAt: true,
          },
        })
        if (!current) return null

        if (result.count > 0) {
          await tx.creditTransaction.create({
            data: {
              organizationId,
              type: 'reset',
              bucket: 'monthly',
              amount,
              balanceMonthlyAfter: current.monthlyCreditsRemaining,
              balanceBonusAfter: current.bonusCreditsRemaining,
              reason: 'comp-monthly-reset',
              metadata: { plan: plan.id },
            },
          })
        }

        return {
          monthly: current.monthlyCreditsRemaining,
          bonus: current.bonusCreditsRemaining,
          total: current.monthlyCreditsRemaining + current.bonusCreditsRemaining,
          resetsAt: current.monthlyCreditsResetAt,
        }
      },
      { isolationLevel: 'Serializable' },
    ),
  )
}

export async function refundCreditSpend(
  organizationId: string,
  spend: SpendResult,
  reason: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.update({
          where: { id: organizationId },
          data: {
            monthlyCreditsRemaining: { increment: spend.fromMonthly },
            bonusCreditsRemaining: { increment: spend.fromBonus },
          },
          select: { monthlyCreditsRemaining: true, bonusCreditsRemaining: true },
        })

        for (const [bucket, amount] of [
          ['monthly', spend.fromMonthly],
          ['bonus', spend.fromBonus],
        ] as const) {
          if (amount <= 0) continue
          await tx.creditTransaction.create({
            data: {
              organizationId,
              type: 'refund',
              bucket,
              amount,
              balanceMonthlyAfter: org.monthlyCreditsRemaining,
              balanceBonusAfter: org.bonusCreditsRemaining,
              reason,
              metadata,
            },
          })
        }
      },
      { isolationLevel: 'Serializable' },
    ),
  )
}

// Atomic credit spend. Drains the monthly bucket first (it resets on renewal,
// so unused monthly credits are "use it or lose it"), then the bonus bucket
// (add-on packs, trial grant — these never expire). Writes one ledger row per
// bucket that was touched so any `CreditTransaction` is auditable in isolation.
export async function spendCredits(
  organizationId: string,
  amount: number,
  reason: string,
  metadata?: Prisma.InputJsonValue,
): Promise<SpendResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Credit amount must be a positive integer')
  }

  await ensureCompMonthlyCredits(organizationId)

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { monthlyCreditsRemaining: true, bonusCreditsRemaining: true },
        })
        if (!org) throw new Error('Organization not found')
        const total = org.monthlyCreditsRemaining + org.bonusCreditsRemaining
        if (total < amount) {
          throw new InsufficientCreditsError(total, amount)
        }

        const fromMonthly = Math.min(amount, org.monthlyCreditsRemaining)
        const fromBonus = amount - fromMonthly
        const newMonthly = org.monthlyCreditsRemaining - fromMonthly
        const newBonus = org.bonusCreditsRemaining - fromBonus

        await tx.organization.update({
          where: { id: organizationId },
          data: {
            monthlyCreditsRemaining: newMonthly,
            bonusCreditsRemaining: newBonus,
          },
        })

        if (fromMonthly > 0) {
          await tx.creditTransaction.create({
            data: {
              organizationId,
              type: 'spend',
              bucket: 'monthly',
              amount: -fromMonthly,
              balanceMonthlyAfter: newMonthly,
              balanceBonusAfter: newBonus,
              reason,
              metadata,
            },
          })
        }
        if (fromBonus > 0) {
          await tx.creditTransaction.create({
            data: {
              organizationId,
              type: 'spend',
              bucket: 'bonus',
              amount: -fromBonus,
              balanceMonthlyAfter: newMonthly,
              balanceBonusAfter: newBonus,
              reason,
              metadata,
            },
          })
        }

        return { spent: amount, fromMonthly, fromBonus, newMonthly, newBonus }
      },
      { isolationLevel: 'Serializable' },
    ),
  )
}

interface GrantArgs {
  type: 'grant' | 'purchase'
  reason: string
  metadata?: Prisma.InputJsonValue
}

// Add credits to the bonus bucket. Used for trial grants (type='grant',
// reason='trial-start'), add-on pack purchases (type='purchase'), and any
// manual admin top-ups.
export async function grantBonusCredits(
  organizationId: string,
  amount: number,
  { type, reason, metadata }: GrantArgs,
): Promise<{ newBonus: number }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Grant amount must be a positive integer')
  }
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: organizationId },
      data: { bonusCreditsRemaining: { increment: amount } },
      select: { monthlyCreditsRemaining: true, bonusCreditsRemaining: true },
    })
    await tx.creditTransaction.create({
      data: {
        organizationId,
        type,
        bucket: 'bonus',
        amount,
        balanceMonthlyAfter: org.monthlyCreditsRemaining,
        balanceBonusAfter: org.bonusCreditsRemaining,
        reason,
        metadata,
      },
    })
    return { newBonus: org.bonusCreditsRemaining }
  })
}

// Called by the Stripe webhook on subscription renewal. Unused monthly credits
// are discarded — this is deliberate, it's the pricing model. The bonus bucket
// is untouched.
export async function resetMonthlyCredits(
  organizationId: string,
  amount: number,
  resetAt: Date,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: organizationId },
      data: {
        monthlyCreditsRemaining: amount,
        monthlyCreditsResetAt: resetAt,
      },
      select: { monthlyCreditsRemaining: true, bonusCreditsRemaining: true },
    })
    await tx.creditTransaction.create({
      data: {
        organizationId,
        type: 'reset',
        bucket: 'monthly',
        amount,
        balanceMonthlyAfter: org.monthlyCreditsRemaining,
        balanceBonusAfter: org.bonusCreditsRemaining,
        reason: 'monthly-reset',
      },
    })
  })
}
