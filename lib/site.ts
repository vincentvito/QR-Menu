export const SITE_NAME = 'Qtable'

const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
const configuredUrlIsLocal =
  configuredUrl?.includes('localhost') || configuredUrl?.includes('127.0.0.1')

export const SITE_URL = (
  process.env.NODE_ENV === 'production' && configuredUrlIsLocal
    ? 'https://qtable.ai'
    : (configuredUrl ?? 'https://qtable.ai')
).replace(/\/$/, '')

export const DEFAULT_TITLE = 'Qtable - Digital menus & QR codes for restaurants'
export const DEFAULT_DESCRIPTION =
  'Turn your printed menu into a beautiful mobile page and a QR code for your tables. Edit a dish once and it updates everywhere, instantly.'

export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Qtable - Beautiful digital menus and QR codes for restaurants',
} as const
