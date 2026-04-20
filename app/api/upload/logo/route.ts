import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { extFromMimeType, keyForOrgLogo, keyForUserLogo, uploadBuffer } from '@/lib/storage/r2'

export const runtime = 'nodejs'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
// 2 MB cap — logos are small. Bigger files go back as 413.
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  // Two contexts for this endpoint:
  // - Settings: user already has an active org → upload to org scope, role-gated.
  // - Onboarding: user hasn't created an org yet → upload to user scope so
  //   we have a URL to save when they submit the onboarding form.
  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (org) {
    const membership = await prisma.member.findFirst({
      where: { organizationId: org.id, userId: session.user.id },
      select: { role: true },
    })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
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
    return NextResponse.json({ error: 'Logo must be under 2 MB' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extFromMimeType(file.type)
  const stamp = randomBytes(4).toString('hex')
  const key = org ? keyForOrgLogo(org.id, ext, stamp) : keyForUserLogo(session.user.id, ext, stamp)

  try {
    const { url } = await uploadBuffer({
      key,
      body: buffer,
      contentType: file.type,
    })
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[api/upload/logo] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
