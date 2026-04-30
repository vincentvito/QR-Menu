import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
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

  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: { name?: string } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name must be a string' }, { status: 400 })
    }
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Menu name can\u2019t be empty' }, { status: 400 })
    }
    updates.name = trimmed.slice(0, 120)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
    }
    const menu = await prisma.menu.update({
      where: { id: access.id },
      data: updates,
      select: { id: true, slug: true, name: true },
    })
    revalidatePath(`/m/${menu.slug}`)
    revalidatePath('/dashboard/menus')
    return NextResponse.json(menu)
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Update failed'
    console.error('[api/menus/[slug]] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
