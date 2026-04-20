// Auto-load .env so the script works with a plain `npx tsx` — no wrapper,
// no extra flags.
import 'dotenv/config'

import { readFile, stat } from 'node:fs/promises'
import { uploadBuffer } from '../lib/storage/r2'
import { TEMPLATE_PREVIEW_MOCKUP_KEY } from '../lib/menus/template-assets'

const DEFAULT_SOURCE = '/mnt/e/projects/screenslick/public/mockups/iPhone-17-pro-cosmic-orange.png'

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
  console.log(`Uploading ${body.byteLength} bytes to R2 at ${TEMPLATE_PREVIEW_MOCKUP_KEY}`)

  const { url } = await uploadBuffer({
    key: TEMPLATE_PREVIEW_MOCKUP_KEY,
    body,
    contentType: 'image/png',
  })
  console.log('\n✔ Uploaded')
  console.log('URL:', url)
  console.log('\nOpen that URL in a browser to verify — you should see the phone mockup.')
}

main().catch((err) => {
  console.error('\n✖ Failed:')
  console.error(err)
  process.exit(1)
})
