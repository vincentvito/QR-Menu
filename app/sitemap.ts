import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

const now = () => new Date()

function staticRoutes(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: now(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: now(),
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = staticRoutes()

  try {
    const { default: prisma } = await import('@/lib/prisma')
    const menus = await prisma.menu.findMany({
      select: { slug: true, updatedAt: true },
    })

    return [
      ...routes,
      ...menus.map((menu) => ({
        url: `${SITE_URL}/m/${menu.slug}`,
        lastModified: menu.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ]
  } catch (error) {
    console.error('Failed to build menu sitemap entries', error)
    return routes
  }
}
