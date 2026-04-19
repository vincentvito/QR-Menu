import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  extFromMimeType,
  keyForMenuItemImage,
  uploadBuffer,
} from '@/lib/storage/r2'

export const runtime = 'nodejs'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
// 5 MB — dish photos can be larger than logos but phone cameras dumping
// 15 MB full-res should be compressed client-side first.
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  let file: File | null = null
  let itemId: string | null = null
  try {
    const form = await request.formData()
    const raw = form.get('file')
    if (raw instanceof File) file = raw
    const rawId = form.get('itemId')
    if (typeof rawId === 'string') itemId = rawId
  } catch {
    return NextResponse.json({ error: 'Invalid upload body' }, { status: 400 })
  }

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || 'unknown'}` },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Photo must be under 5 MB' },
      { status: 413 },
    )
  }

  // Authorize: the dish must belong to a menu in an org the viewer is a
  // member of. One query covers both checks via the menu → organization →
  // members relation.
  const item = await prisma.menuItem.findFirst({
    where: {
      id: itemId,
      menu: {
        organization: {
          members: { some: { userId: session.user.id } },
        },
      },
    },
    select: {
      id: true,
      menu: { select: { organizationId: true } },
    },
  })
  if (!item) {
    return NextResponse.json({ error: 'Dish not found' }, { status: 404 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extFromMimeType(file.type)
  const stamp = randomBytes(4).toString('hex')
  const key = keyForMenuItemImage(item.menu.organizationId, item.id, ext, stamp)

  try {
    const { url } = await uploadBuffer({
      key,
      body: buffer,
      contentType: file.type,
    })
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[api/upload/menu-item-image] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
