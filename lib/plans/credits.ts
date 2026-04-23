import type { Prisma } from '@/lib/generated/prisma/client'
import prisma from '@/lib/prisma'

export class InsufficientCreditsError extends Error {
  constructor(public available: number, public requested: number) {
    super(`Insufficient credits: have ${available}, need ${requested}`)
    this.name = 'InsufficientCreditsError'
  }
}

interface SpendResult {
  spent: number
  fromMonthly: number
  fromBonus: number
  newMonthly: number
  newBonus: number
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

  return prisma.$transaction(async (tx) => {
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
  })
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
