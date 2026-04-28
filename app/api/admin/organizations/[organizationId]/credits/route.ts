import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { Prisma } from '@/lib/generated/prisma/client'
import { grantBonusCredits } from '@/lib/plans/credits'

export const runtime = 'nodejs'

const MAX_REASON = 120
const MAX_CREDITS = 10000

function cleanReason(value: unknown): string {
  if (typeof value !== 'string') return 'admin-credit-grant'
  const trimmed = value.trim().slice(0, MAX_REASON)
  return trimmed || 'admin-credit-grant'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { organizationId } = await params
  let body: { amount?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_CREDITS) {
    return NextResponse.json(
      { error: `Amount must be between 1 and ${MAX_CREDITS}` },
      { status: 400 },
    )
  }

  let result: { newBonus: number }
  try {
    result = await grantBonusCredits(organizationId, amount, {
      type: 'grant',
      reason: cleanReason(body.reason),
      metadata: { grantedBy: session.user.id },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    throw err
  }

  after(() => {
    revalidatePath('/admin/users')
    revalidatePath('/admin')
    revalidatePath('/dashboard/billing')
  })

  return NextResponse.json({ ok: true, bonusCreditsRemaining: result.newBonus })
}
