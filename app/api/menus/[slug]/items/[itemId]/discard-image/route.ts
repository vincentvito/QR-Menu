import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deleteByUrl } from '@/lib/storage/r2'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ slug: string; itemId: string }>
}

// Deletes an AI-generated image from R2 that the owner chose not to keep.
// Authorized via membership + a path check: the URL must live under the
// item's own bucket prefix so a member can't use this to delete arbitrary
// R2 objects even inside their org.
export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { slug, itemId } = await params

  let url: string | null = null
  try {
    const body = (await request.json()) as { url?: unknown }
    if (typeof body.url === 'string') url = body.url
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      menu: {
        slug,
        organization: { members: { some: { userId: session.user.id } } },
      },
    },
    select: { id: true, menu: { select: { organizationId: true } } },
  })
  if (!item) {
    return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
  }

  // Safety: only allow deleting URLs that live under this item's folder.
  // Without this, a compromised client could ask the server to delete any
  // R2 object reachable from the worker.
  const itemPrefix = `/qrmenucrafter/orgs/${item.menu.organizationId}/items/${item.id}/`
  try {
    const parsed = new URL(url)
    if (!parsed.pathname.startsWith(itemPrefix)) {
      return NextResponse.json({ error: 'URL not owned by this dish' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  void deleteByUrl(url)
  return NextResponse.json({ ok: true })
}
