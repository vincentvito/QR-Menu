import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'
import { translatedApiError } from '@/lib/api/errors'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }
  const { slug } = await params

  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  const updates: { name?: string } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
    }
    const trimmed = body.name.trim()
    if (!trimmed) {
      return NextResponse.json({ error: t('menus.nameEmpty') }, { status: 400 })
    }
    updates.name = trimmed.slice(0, 120)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: t('common.noFieldsToUpdate') }, { status: 400 })
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json(
        {
          error: writeGate.reason
            ? t(writeGate.reason.key, writeGate.reason.params)
            : t('gates.subscriptionLapsed'),
          gate: writeGate.gate,
        },
        { status: 402 },
      )
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
    const message = translatedApiError(t, err, 'common.updateFailed')
    console.error('[api/menus/[slug]] patch failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
