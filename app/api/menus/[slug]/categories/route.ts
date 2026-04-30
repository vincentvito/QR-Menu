import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { slug } = await params
  let body: { from?: unknown; to?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const from = typeof body.from === 'string' ? body.from.trim() : ''
  const to = typeof body.to === 'string' ? body.to.trim().slice(0, 80) : ''
  if (!from || !to) {
    return NextResponse.json({ error: 'Category names are required' }, { status: 400 })
  }
  if (from === to) {
    return NextResponse.json({ updatedCount: 0, category: to })
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
    }

    const result = await prisma.menuItem.updateMany({
      where: { menuId: access.id, category: from },
      data: { category: to },
    })

    return NextResponse.json({ updatedCount: result.count, category: to })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Category update failed'
    console.error('[api/menus/[slug]/categories] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
