import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Private surfaces stay un-indexed. The landing, changelog, and public
// menu routes (/m/[slug]) are free-for-all — we want every restaurant's
// menu discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/m/', '/changelog'],
        disallow: ['/api/', '/auth/', '/dashboard/', '/admin/', '/onboarding', '/accept-invite'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
