import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { extFromMimeType, keyForOrgHeader, uploadBuffer } from '@/lib/storage/r2'

export const runtime = 'nodejs'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
// 20 MB — header images are hero-sized and modern phone cameras produce
// 10–15 MB JPEGs routinely. The public menu loads the original so the
// number won't balloon our R2 bill at typical scale.
const MAX_BYTES = 20 * 1024 * 1024

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) {
    return NextResponse.json({ error: 'No active restaurant' }, { status: 409 })
  }
  const membership = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const raw = form.get('file')
    if (raw instanceof File) file = raw
  } catch {
    return NextResponse.json({ error: 'Invalid upload body' }, { status: 400 })
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
    return NextResponse.json({ error: 'Header image must be under 20 MB' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extFromMimeType(file.type)
  const stamp = randomBytes(4).toString('hex')
  const key = keyForOrgHeader(org.id, ext, stamp)

  try {
    const { url } = await uploadBuffer({ key, body: buffer, contentType: file.type })
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[api/upload/header] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
