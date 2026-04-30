import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { generateMenuItemDescription } from '@/lib/ai/gemini'
import { requireMenuAccess } from '@/lib/menus/get'
import { canWriteRestaurant } from '@/lib/plans/subscription-access'

export const runtime = 'nodejs'
export const maxDuration = 30

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { slug } = await params
  let body: { name?: unknown; category?: unknown; notes?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Dish name is required' }, { status: 400 })
  }

  try {
    const access = await requireMenuAccess(slug, session.user.id)
    const writeGate = await canWriteRestaurant(access.organizationId, access.restaurantId)
    if (!writeGate.allowed) {
      return NextResponse.json({ error: writeGate.reason, gate: writeGate.gate }, { status: 402 })
    }

    const description = await generateMenuItemDescription({
      name,
      category: typeof body.category === 'string' ? body.category : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    })

    return NextResponse.json({ description })
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500
    const message = err instanceof Error ? err.message : 'Description generation failed'
    console.error('[api/menus/[slug]/items/description] post failed:', err)
    return NextResponse.json({ error: message }, { status })
  }
}
