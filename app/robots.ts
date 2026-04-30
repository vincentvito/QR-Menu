import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public: landing, changelog, and restaurant menus.
// Private: app surfaces, auth, admin, onboarding, invitations, and APIs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/m/', '/changelog'],
        disallow: [
          '/api/',
          '/admin/',
          '/auth/',
          '/dashboard/',
          '/onboarding/',
          '/accept-invite',
          '/accept-restaurant-invite',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
