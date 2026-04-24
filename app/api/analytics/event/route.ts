import { NextResponse, after } from 'next/server'
import { cookies, headers } from 'next/headers'
import prisma from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'
import {
  ANALYTICS_SESSION_COOKIE,
  isMenuEventType,
  type MenuEventType,
} from '@/lib/analytics/events'

export const runtime = 'nodejs'

// Lightweight telemetry sink for the public menu. No auth — events come
// from anonymous guests. We trust the `menuSlug` to resolve into a
// restaurant, but keep the door narrow: unknown slug = silently ignored,
// unknown event type = 400, oversized payload = 400. Failure modes
// return 2xx when possible so a flaky log layer doesn't break menus.
//
// Idempotency is *not* enforced here — same event can legitimately fire
// twice (e.g. a dish tapped twice). The dashboard aggregates handle dedup
// where it matters (e.g. unique-session views).
export async function POST(request: Request) {
  let body: {
    type?: unknown
    menuSlug?: unknown
    payload?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isMenuEventType(body.type)) {
    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
  }
  const type: MenuEventType = body.type

  if (typeof body.menuSlug !== 'string' || !body.menuSlug) {
    return NextResponse.json({ error: 'menuSlug is required' }, { status: 400 })
  }

  // Guard against accidental payload bloat. Everything we care about
  // fits in a few hundred bytes.
  let payload: Prisma.InputJsonValue | undefined
  if (body.payload !== undefined) {
    if (
      typeof body.payload !== 'object' ||
      body.payload === null ||
      Array.isArray(body.payload)
    ) {
      return NextResponse.json({ error: 'payload must be an object' }, { status: 400 })
    }
    const serialized = JSON.stringify(body.payload)
    if (serialized.length > 2048) {
      return NextResponse.json({ error: 'payload too large' }, { status: 400 })
    }
    payload = body.payload as Prisma.InputJsonValue
  }

  // Menu lookup, cookie, and headers are all independent — resolve in
  // parallel so the 200 can ack as fast as possible.
  const [menu, cookieStore, requestHeaders] = await Promise.all([
    prisma.menu.findUnique({
      where: { slug: body.menuSlug },
      select: { id: true, restaurantId: true },
    }),
    cookies(),
    headers(),
  ])

  if (!menu || !menu.restaurantId) {
    // Silently ack — we don't want to leak "which slugs are real" to
    // anyone poking at this endpoint, and the client doesn't need to
    // retry.
    return NextResponse.json({ ok: true })
  }

  const sessionId = cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value ?? 'no-session'
  // Cap UA so an exotic client can't blow up our row size.
  const userAgent = requestHeaders.get('user-agent')?.slice(0, 500) ?? null

  // Fire-and-forget the write. Clients use `sendBeacon`, which doesn't
  // wait for the response body — so we free the Node worker immediately
  // and let the DB write happen after the 200 is on the wire. Higher
  // throughput under burst traffic (a full dinner rush hitting the
  // endpoint from dozens of devices at once).
  after(async () => {
    try {
      await prisma.menuEvent.create({
        data: {
          restaurantId: menu.restaurantId,
          menuId: menu.id,
          type,
          payload: payload ?? undefined,
          sessionId,
          userAgent,
        },
      })
    } catch (err) {
      // Analytics writes must never surface as user-facing errors; log
      // and move on. If we're dropping events, we'll see it in logs.
      console.error('[analytics/event] write failed:', err)
    }
  })

  return NextResponse.json({ ok: true })
}
