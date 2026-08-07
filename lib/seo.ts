import type { Metadata, MetadataRoute } from 'next'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE, SITE_NAME, SITE_URL } from './site'

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

export type AcquisitionRoute = {
  path: '/' | '/changelog'
  title: string
  description: string
  socialImage: string
  publishedAt: string
  modifiedAt: string
  changeFrequency: ChangeFrequency
  priority: number
  indexable: boolean
  breadcrumbs?: readonly { name: string; path: string }[]
}

export const ACQUISITION_ROUTES = [
  {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    socialImage: OG_IMAGE.url,
    publishedAt: '2026-06-13',
    modifiedAt: '2026-08-07',
    changeFrequency: 'monthly',
    priority: 1,
    indexable: true,
  },
  {
    path: '/changelog',
    title: 'Qtable product updates and changelog',
    description:
      'See the latest improvements to Qtable digital menus, QR codes, and restaurant tools.',
    socialImage: OG_IMAGE.url,
    publishedAt: '2026-08-01',
    modifiedAt: '2026-08-07',
    changeFrequency: 'weekly',
    priority: 0.4,
    indexable: true,
  },
] as const satisfies readonly AcquisitionRoute[]

export type AcquisitionPath = (typeof ACQUISITION_ROUTES)[number]['path']

export const INDEXABLE_ROBOTS: NonNullable<Metadata['robots']> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
}

export function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return normalizedPath === '/' ? SITE_URL : `${SITE_URL}${normalizedPath}`
}

export function getAcquisitionRoute(path: AcquisitionPath) {
  const route = ACQUISITION_ROUTES.find((candidate) => candidate.path === path)

  if (!route) {
    throw new Error(`Unknown acquisition route: ${path}`)
  }

  return route
}

export function buildPageMetadata(route: AcquisitionRoute): Metadata {
  const canonical = absoluteUrl(route.path)
  const socialImage = absoluteUrl(route.socialImage)

  return {
    title: { absolute: route.title },
    description: route.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: route.title,
      description: route.description,
      url: canonical,
      images: [
        {
          ...OG_IMAGE,
          url: socialImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: route.title,
      description: route.description,
      images: [socialImage],
    },
    robots: route.indexable ? INDEXABLE_ROBOTS : { index: false, follow: false },
  }
}

export function acquisitionSitemapEntries(): MetadataRoute.Sitemap {
  return ACQUISITION_ROUTES.filter((route) => route.indexable).map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.modifiedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}

export function publicMenuSitemapEntry(slug: string, updatedAt: Date) {
  return {
    url: absoluteUrl(`/m/${slug}`),
    lastModified: updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }
}

export type FaqItem = {
  question: string
  answer: string
}

export const FAQ_KEYS = ['savvy', 'price', 'wifi', 'scans', 'expired', 'domain'] as const

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildHomepageJsonLd() {
  const homepage = getAcquisitionRoute('/')

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: absoluteUrl('/'),
        description: homepage.description,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  }
}
