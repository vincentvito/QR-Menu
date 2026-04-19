import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { isBadgeKey } from '@/lib/menus/badges'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

async function ensureOwnership(slug: string, itemId: string, userId: string) {
  const access = await requireMenuAccess(slug, userId)
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, menuId: true },
  })
  if (!item || item.menuId !== access.id) {
    throw Object.assign(new Error('Item not found'), { status: 404 })
  }
  return { menuId: access.id, itemId: item.id }
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
    badges?: unknown
    specialUntil?: unknown
    imageUrl?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: {
    name?: string
    description?: string
    price?: number
    category?: string
    badges?: string[]
    specialUntil?: Date | null
    imageUrl?: string | null
  } = {}

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
  if (body.badges !== undefined) {
    if (!Array.isArray(body.badges)) {
      return NextResponse.json({ error: 'badges must be an array' }, { status: 400 })
    }
    updates.badges = Array.from(new Set(body.badges.filter(isBadgeKey)))
  }
  if (body.imageUrl !== undefined) {
    if (body.imageUrl === null || body.imageUrl === '') {
      updates.imageUrl = null
    } else if (typeof body.imageUrl === 'string') {
      try {
        updates.imageUrl = new URL(body.imageUrl).toString()
      } catch {
        return NextResponse.json({ error: 'imageUrl must be a valid URL' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'imageUrl must be a string or null' }, { status: 400 })
    }
  }
  if (body.specialUntil !== undefined) {
    if (body.specialUntil === null) {
      updates.specialUntil = null
    } else if (typeof body.specialUntil === 'string') {
      const d = new Date(body.specialUntil)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'specialUntil must be an ISO date string' }, { status: 400 })
      }
      updates.specialUntil = d
    } else {
      return NextResponse.json({ error: 'specialUntil must be ISO string or null' }, { status: 400 })
    }
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
