import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const revalidate = 3600 // regenerate at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const menus = await prisma.menu.findMany({
    select: { slug: true, updatedAt: true },
  })

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    ...menus.map((m) => ({
      url: `${SITE_URL}/m/${m.slug}`,
      lastModified: m.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
