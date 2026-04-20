import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 client. Env var names mirror the sibling projects
 * (menu-design-ai, screenslick) so they can share the same bucket.
 *
 *   CLOUDFLARE_BUCKET_API        — endpoint, e.g. https://{accountId}.r2.cloudflarestorage.com
 *   CLOUDFLARE_ACCESS_KEY_ID     — R2 API token access key
 *   CLOUDFLARE_SECRET_ACCESS_KEY — R2 API token secret
 *   CLOUDFLARE_BUCKET_NAME       — bucket name (shared)
 *   CLOUDFLARE_PUBLIC_URL        — public base URL, e.g. https://files.screenslick.com
 *
 * qrmenucrafter objects live under the `qrmenucrafter/` key prefix so they
 * don't collide with menugenai/ or screenslick's transfer/ objects.
 */

const KEY_PREFIX = 'qrmenucrafter'

function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env var: ${key}`)
  return v
}

let _client: S3Client | null = null

function client(): S3Client {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: requireEnv('CLOUDFLARE_BUCKET_API'),
    credentials: {
      accessKeyId: requireEnv('CLOUDFLARE_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('CLOUDFLARE_SECRET_ACCESS_KEY'),
    },
  })
  return _client
}

export function publicUrl(key: string): string {
  const base = requireEnv('CLOUDFLARE_PUBLIC_URL').replace(/\/+$/, '')
  return `${base}/${key}`
}

// Include a short random id so re-uploads bust browser + CDN caches without
// hitting the bucket with a purge. The org id is the primary key so different
// restaurants never collide.
export function keyForOrgLogo(orgId: string, ext: string, stamp: string): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'webp'
  return `${KEY_PREFIX}/orgs/${orgId}/logo-${stamp}.${safeExt}`
}

// Used during onboarding, before an organization exists. Scoped to the
// authenticated user so uploads can't collide across users.
export function keyForUserLogo(userId: string, ext: string, stamp: string): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'webp'
  return `${KEY_PREFIX}/users/${userId}/logo-${stamp}.${safeExt}`
}

// Per-dish photo. Keyed by org (not menu) so moving a dish between menus
// doesn't orphan its image. The stamp busts browser/CDN caches on reupload.
export function keyForMenuItemImage(
  orgId: string,
  itemId: string,
  ext: string,
  stamp: string,
): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'webp'
  return `${KEY_PREFIX}/orgs/${orgId}/items/${itemId}/photo-${stamp}.${safeExt}`
}

export async function uploadBuffer({
  key,
  body,
  contentType,
  cacheControl = 'public, max-age=31536000, immutable',
}: {
  key: string
  body: Buffer
  contentType: string
  cacheControl?: string
}): Promise<{ key: string; url: string }> {
  await client().send(
    new PutObjectCommand({
      Bucket: requireEnv('CLOUDFLARE_BUCKET_NAME'),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  )
  return { key, url: publicUrl(key) }
}

// Best-effort delete: turns a public URL back into its bucket key (only
// when the URL is under our CLOUDFLARE_PUBLIC_URL base, i.e. we own it) and
// removes the object. Safe to call with URLs we don't own — it no-ops.
// Never throws — callers should `.catch` anyway if they want to log failures.
export async function deleteByUrl(url: string): Promise<void> {
  try {
    const base = requireEnv('CLOUDFLARE_PUBLIC_URL').replace(/\/+$/, '')
    const prefix = `${base}/`
    if (!url.startsWith(prefix)) return
    const key = url.slice(prefix.length)
    if (!key) return
    await client().send(
      new DeleteObjectCommand({
        Bucket: requireEnv('CLOUDFLARE_BUCKET_NAME'),
        Key: key,
      }),
    )
  } catch (err) {
    // Swallow — orphaned files aren't worth failing a user action for.
    console.warn('[r2.deleteByUrl] failed:', err)
  }
}

export function extFromMimeType(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}
