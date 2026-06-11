import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveOrganization } from '@/lib/organizations/get-active-org'
import { extFromMimeType, keyForOrgHeader, uploadBuffer } from '@/lib/storage/r2'
import { canWriteDashboard } from '@/lib/plans/subscription-access'
import { getTranslations } from 'next-intl/server'
import { translatedApiError } from '@/lib/api/errors'

export const runtime = 'nodejs'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
// 20 MB — header images are hero-sized and modern phone cameras produce
// 10–15 MB JPEGs routinely. The public menu loads the original so the
// number won't balloon our R2 bill at typical scale.
const MAX_BYTES = 20 * 1024 * 1024

export async function POST(request: Request) {
  const t = await getTranslations('Api')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 })
  }

  const org = await getActiveOrganization({
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  })
  if (!org) {
    return NextResponse.json({ error: t('common.noActiveRestaurant') }, { status: 409 })
  }
  const membership = await prisma.member.findFirst({
    where: { organizationId: org.id, userId: session.user.id },
    select: { role: true },
  })
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: t('common.notAllowed') }, { status: 403 })
  }
  const writeGate = await canWriteDashboard(org.id)
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

  let file: File | null = null
  try {
    const form = await request.formData()
    const raw = form.get('file')
    if (raw instanceof File) file = raw
  } catch {
    return NextResponse.json({ error: t('common.invalidBody') }, { status: 400 })
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: t('common.noFileProvided') }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: t('common.unsupportedFileType', { type: file.type || 'unknown' }) },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: t('upload.headerTooLarge') }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extFromMimeType(file.type)
  const stamp = randomBytes(4).toString('hex')
  const key = keyForOrgHeader(org.id, ext, stamp)

  try {
    const { url } = await uploadBuffer({ key, body: buffer, contentType: file.type })
    return NextResponse.json({ url })
  } catch (err) {
    const message = translatedApiError(t, err, 'upload.uploadFailed')
    console.error('[api/upload/header] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
