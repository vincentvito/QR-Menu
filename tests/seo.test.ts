import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import robots from '../app/robots'
import { serializeJsonLd } from '../components/seo/JsonLd'
import {
  ACQUISITION_ROUTES,
  INDEXABLE_ROBOTS,
  absoluteUrl,
  acquisitionSitemapEntries,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
  buildHomepageJsonLd,
  buildPageMetadata,
  getAcquisitionRoute,
  publicMenuSitemapEntry,
} from '../lib/seo'
import { SITE_URL } from '../lib/site'

const PRIVATE_PREFIXES = [
  '/api/',
  '/admin/',
  '/auth/',
  '/dashboard/',
  '/onboarding/',
  '/accept-invite',
  '/accept-restaurant-invite',
  '/analytics-reports/',
]

test('acquisition pages have unique absolute self-canonicals', () => {
  const canonicals = ACQUISITION_ROUTES.map((route) => {
    const metadata = buildPageMetadata(route)
    const canonical = String(metadata.alternates?.canonical)

    assert.equal(canonical, absoluteUrl(route.path))
    assert.ok(canonical.startsWith('https://'))
    assert.deepEqual(metadata.robots, INDEXABLE_ROBOTS)
    return canonical
  })

  assert.equal(new Set(canonicals).size, canonicals.length)
  assert.deepEqual(
    ACQUISITION_ROUTES.filter((route) => absoluteUrl(route.path) === SITE_URL).map(
      (route) => route.path,
    ),
    ['/'],
  )
})

test('the SEO registry includes only live static acquisition routes', () => {
  assert.deepEqual(
    ACQUISITION_ROUTES.map((route) => route.path),
    ['/', '/blog', '/qr-menu-from-pdf', '/changelog'],
  )
  assert.equal(
    new Set(ACQUISITION_ROUTES.map((route) => route.title)).size,
    ACQUISITION_ROUTES.length,
  )
  assert.equal(
    new Set(ACQUISITION_ROUTES.map((route) => route.heading)).size,
    ACQUISITION_ROUTES.length,
  )
  assert.equal(
    new Set(ACQUISITION_ROUTES.map((route) => route.primaryIntent)).size,
    ACQUISITION_ROUTES.length,
  )
})

test('hub breadcrumbs are absolute, parseable, and match the visible breadcrumb model', () => {
  const route = getAcquisitionRoute('/qr-menu-from-pdf')
  assert.deepEqual(
    { path: route.path, title: route.title, heading: route.heading, intent: route.primaryIntent },
    {
      path: '/qr-menu-from-pdf',
      title: 'Convert a PDF Menu to an Editable QR Menu | Qtable',
      heading: 'Turn your PDF into an editable mobile QR menu',
      intent: 'convert PDF menu to QR code',
    },
  )
  const breadcrumbs = route.breadcrumbs ?? []
  const schema = buildBreadcrumbJsonLd(breadcrumbs)
  const parsed = JSON.parse(serializeJsonLd(schema))

  assert.deepEqual(
    parsed.itemListElement.map((entry: { name: string; item: string }) => ({
      name: entry.name,
      item: entry.item,
    })),
    breadcrumbs.map((breadcrumb) => ({
      name: breadcrumb.name,
      item: absoluteUrl(breadcrumb.path),
    })),
  )

  const pageSource = readFileSync(
    new URL('../app/qr-menu-from-pdf/page.tsx', import.meta.url),
    'utf8',
  )
  assert.match(pageSource, /buildBreadcrumbJsonLd\(breadcrumbs\)/)
  assert.match(pageSource, /<nav[\s\S]*?aria-label="Breadcrumb"/)
  assert.match(pageSource, /breadcrumbs\.map/)
})

test('static sitemap entries are absolute, unique, deterministic, and public', () => {
  const first = acquisitionSitemapEntries()
  const second = acquisitionSitemapEntries()
  const urls = first.map((entry) => entry.url)

  assert.deepEqual(first, second)
  assert.equal(new Set(urls).size, urls.length)
  assert.deepEqual(
    urls,
    ACQUISITION_ROUTES.filter((route) => route.indexable).map((route) => absoluteUrl(route.path)),
  )

  for (const entry of first) {
    assert.ok(entry.url.startsWith('https://'))
    assert.match(String(entry.lastModified), /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(!PRIVATE_PREFIXES.some((prefix) => new URL(entry.url).pathname.startsWith(prefix)))
  }
})

test('public menu sitemap entries preserve database update dates', () => {
  const updatedAt = new Date('2026-07-31T18:45:00.000Z')
  const entry = publicMenuSitemapEntry('dinner', updatedAt)

  assert.equal(entry.url, `${SITE_URL}/m/dinner`)
  assert.equal(entry.lastModified, updatedAt)
  assert.equal(entry.changeFrequency, 'weekly')
  assert.equal(entry.priority, 0.8)
})

test('JSON-LD serialization is parseable and escapes opening angle brackets', () => {
  const data = { '@context': 'https://schema.org', name: '<script>alert(1)</script>' }
  const serialized = serializeJsonLd(data)

  assert.ok(!serialized.includes('<'))
  assert.deepEqual(JSON.parse(serialized), data)
})

test('FAQ schema contains the exact visible questions and answers', () => {
  const items = [
    { question: 'Can I update my menu?', answer: 'Yes, updates appear at the same QR code.' },
    { question: 'Do guests need an app?', answer: 'No, the menu opens in their browser.' },
  ]
  const schema = buildFaqJsonLd(items)
  const entities = schema.mainEntity

  assert.deepEqual(
    entities.map((entity) => ({
      question: entity.name,
      answer: entity.acceptedAnswer.text,
    })),
    items,
  )

  const landingSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
  assert.match(landingSource, /buildFaqJsonLd\(faqItems\)/)
  assert.match(landingSource, /<Faq t=\{t\} items=\{faqItems\} \/>/)
  assert.match(landingSource, /\{item\.question\}/)
  assert.match(landingSource, /\{item\.answer\}/)
})

test('homepage organization and website schema uses the public site identity', () => {
  const schema = buildHomepageJsonLd()
  const parsed = JSON.parse(serializeJsonLd(schema))

  assert.equal(parsed['@context'], 'https://schema.org')
  assert.deepEqual(
    parsed['@graph'].map((entry: { '@type': string; url: string }) => ({
      type: entry['@type'],
      url: entry.url,
    })),
    [
      { type: 'Organization', url: SITE_URL },
      { type: 'WebSite', url: SITE_URL },
    ],
  )
})

test('robots rules block private surfaces without conflicting with acquisition pages', () => {
  const config = robots()
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules]
  const disallowed = rules.flatMap((rule) =>
    Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [],
  )

  for (const prefix of PRIVATE_PREFIXES) {
    assert.ok(disallowed.includes(prefix))
  }

  for (const route of ACQUISITION_ROUTES.filter((candidate) => candidate.indexable)) {
    assert.ok(!disallowed.some((prefix) => route.path.startsWith(prefix)))
  }

  assert.ok(!disallowed.some((prefix) => '/m/example'.startsWith(prefix)))
})
