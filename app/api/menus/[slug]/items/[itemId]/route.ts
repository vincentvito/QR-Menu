import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuOwner } from '@/lib/menus/get'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

async function ensureOwnership(slug: string, itemId: string, userId: string) {
  const owner = await requireMenuOwner(slug, userId)
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, menuId: true },
  })
  if (!item || item.menuId !== owner.id) {
    throw Object.assign(new Error('Item not found'), { status: 404 })
  }
  return { menuId: owner.id, itemId: item.id }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const { slug, itemId } = await params

  let body: {
    name?: unknown
    description?: unknown
    price?: unknown
    category?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: { name?: string; description?: string; price?: number; category?: string } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    updates.name = body.name.trim().slice(0, 200)
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      return NextResponse.json({ error: 'description must be a string' }, { status: 400 })
    }
    updates.description = body.description.slice(0, 1000)
  }
  if (body.price !== undefined) {
    const p = typeof body.price === 'number' ? body.price : parseFloat(String(body.price))
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }
    updates.price = Math.round(p * 100) / 100
  }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !body.category.trim()) {
      return NextResponse.json({ error: 'category must be a non-empty string' }, { status: 400 })
    }
    updates.category = body.category.trim().slice(0, 80)
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    await ensureOwnership(slug, itemId, session.user.id)
    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: updates,
    })
    return NextResponse.json(item)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Update failed'
    console.error('[api/menus/[slug]/items/[itemId]] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const { slug, itemId } = await params

  try {
    await ensureOwnership(slug, itemId, session.user.id)
    await prisma.menuItem.delete({ where: { id: itemId } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Delete failed'
    console.error('[api/menus/[slug]/items/[itemId]] delete failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
