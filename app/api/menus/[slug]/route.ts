import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuOwner } from '@/lib/menus/get'
import { isSupportedCurrency } from '@/lib/menus/currency'

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

  let body: { restaurantName?: unknown; currency?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: { restaurantName?: string; currency?: string } = {}

  if (body.restaurantName !== undefined) {
    if (typeof body.restaurantName !== 'string') {
      return NextResponse.json({ error: 'restaurantName must be a string' }, { status: 400 })
    }
    const trimmed = body.restaurantName.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Restaurant name can\u2019t be empty' }, { status: 400 })
    }
    updates.restaurantName = trimmed.slice(0, 120)
  }

  if (body.currency !== undefined) {
    if (!isSupportedCurrency(body.currency)) {
      return NextResponse.json({ error: `Unsupported currency` }, { status: 400 })
    }
    updates.currency = body.currency
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const owner = await requireMenuOwner(slug, session.user.id)
    const menu = await prisma.menu.update({
      where: { id: owner.id },
      data: updates,
      select: { id: true, slug: true, restaurantName: true, currency: true },
    })
    return NextResponse.json(menu)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Update failed'
    console.error('[api/menus/[slug]] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
