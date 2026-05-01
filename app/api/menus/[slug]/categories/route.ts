import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'
import {
  isCategoryIconId,
  parseCategoryIconOverrides,
  type CategoryIconId,
} from '@/lib/menus/category-icon'

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
  let body: { from?: unknown; to?: unknown; category?: unknown; icon?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const from = typeof body.from === 'string' ? body.from.trim() : ''
  const to = typeof body.to === 'string' ? body.to.trim().slice(0, 80) : ''
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 80) : ''
  const hasRename = body.from !== undefined || body.to !== undefined
  const hasIcon = body.icon !== undefined
  if (hasRename && (!from || !to)) {
    return NextResponse.json({ error: 'Category names are required' }, { status: 400 })
  }
  if (hasIcon && !isCategoryIconId(body.icon)) {
    return NextResponse.json({ error: 'Choose a valid category icon' }, { status: 400 })
  }
  if (hasIcon && !category && !to) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }
  if (!hasRename && !hasIcon) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
    }

    const menu = await prisma.menu.findUnique({
      where: { id: access.id },
      select: { slug: true, categoryIcons: true },
    })
    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    }

    let updatedCount = 0
    const categoryIcons = parseCategoryIconOverrides(menu.categoryIcons)
    const responseCategory = to || category

    if (hasRename && from !== to) {
      const result = await prisma.menuItem.updateMany({
        where: { menuId: access.id, category: from },
        data: { category: to },
      })
      updatedCount = result.count
      if (from in categoryIcons) {
        categoryIcons[to] = categoryIcons[from]
        delete categoryIcons[from]
      }
    }

    if (hasIcon) {
      categoryIcons[responseCategory] = body.icon as CategoryIconId
    }

    await prisma.menu.update({
      where: { id: access.id },
      data: { categoryIcons },
      select: { id: true },
    })

    revalidatePath(`/m/${menu.slug}`)
    revalidatePath(`/dashboard/menus/${menu.slug}/edit`)
    return NextResponse.json({ updatedCount, category: responseCategory, categoryIcons })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Category update failed'
    console.error('[api/menus/[slug]/categories] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
