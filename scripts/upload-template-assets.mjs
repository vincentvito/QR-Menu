// Pure ESM Node script — no TS, no esbuild, works with plain `node`.
// Uploads the template-picker phone mockup to R2 at a stable key.

import 'dotenv/config'
import { readFile, stat } from 'node:fs/promises'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const DEFAULT_SOURCE =
  '/mnt/e/projects/screenslick/public/mockups/iPhone-17-pro-cosmic-orange.png'

const KEY = 'qrmenucrafter/assets/template-preview-iphone-17-pro.png'

const REQUIRED_ENV = [
  'CLOUDFLARE_BUCKET_API',
  'CLOUDFLARE_ACCESS_KEY_ID',
  'CLOUDFLARE_SECRET_ACCESS_KEY',
  'CLOUDFLARE_BUCKET_NAME',
  'CLOUDFLARE_PUBLIC_URL',
]

async function main() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    console.error('Make sure .env is present at the project root.')
    process.exit(1)
  }

  const source = process.argv[2] ?? DEFAULT_SOURCE
  try {
    await stat(source)
  } catch {
    console.error(`Source file not found: ${source}`)
    console.error('Pass a different path as the first argument.')
    process.exit(1)
  }

  console.log('Reading', source)
  const body = await readFile(source)
  console.log(`Uploading ${body.byteLength} bytes to R2 at ${KEY}`)

  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_BUCKET_API,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    },
  })

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: KEY,
      Body: body,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )

  const base = process.env.CLOUDFLARE_PUBLIC_URL.replace(/\/+$/, '')
  const url = `${base}/${KEY}`
  console.log('\n✔ Uploaded')
  console.log('URL:', url)
  console.log('\nOpen that URL in a browser to verify — you should see the phone mockup.')
}

main().catch((err) => {
  console.error('\n✖ Failed:')
  console.error(err)
  process.exit(1)
})
