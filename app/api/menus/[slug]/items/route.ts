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

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const { slug } = await params

  let body: {
    category?: unknown
    name?: unknown
    description?: unknown
    price?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const category = typeof body.category === 'string' ? body.category.trim() : ''
  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New dish'
  const description = typeof body.description === 'string' ? body.description.slice(0, 1000) : ''
  let price = 0
  if (body.price !== undefined) {
    const p = typeof body.price === 'number' ? body.price : parseFloat(String(body.price))
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }
    price = Math.round(p * 100) / 100
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json(
        { error: writeGate.reason, gate: writeGate.gate },
        { status: 402 },
      )
    }
    // New items go to the end of the full menu so they don't disrupt
    // existing ordering inside their category until the user reorders.
    const last = await prisma.menuItem.findFirst({
      where: { menuId: access.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    const item = await prisma.menuItem.create({
      data: {
        menuId: access.id,
        category: category.slice(0, 80),
        name: name.slice(0, 200),
        description,
        price,
        tags: [],
        order: (last?.order ?? -1) + 1,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Create failed'
    console.error('[api/menus/[slug]/items] create failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
