import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata, MetadataRoute } from 'next'
import { absoluteUrl, INDEXABLE_ROBOTS } from './seo'
import { OG_IMAGE, SITE_NAME } from './site'

const POSTS_DIRECTORY = join(process.cwd(), 'content', 'blog')
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const WORDS_PER_MINUTE = 220

type FrontmatterValue = string | string[] | boolean
type Frontmatter = Record<string, FrontmatterValue>

export type BlogPostSource = {
  fileName: string
  source: string
}

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  modifiedAt?: string
  author: string
  authorRole: string
  tags: string[]
  primaryIntent: string
  image?: string
  imageAlt?: string
  draft: boolean
  content: string
  readingTimeMinutes: number
  readingTime: string
}

export type BlogPostMeta = Omit<BlogPost, 'content'>

type PublicationOptions = {
  production?: boolean
  now?: Date
}

export const BLOG_INDEX = {
  path: '/blog',
  title: 'Restaurant menu guides and practical QR tips | Qtable',
  description:
    'Practical guides for turning printed restaurant menus into clear, editable mobile menus and reliable QR experiences.',
} as const

export function parseBlogSources(
  sources: readonly BlogPostSource[],
  options: PublicationOptions = {},
): BlogPost[] {
  const production = options.production ?? process.env.NODE_ENV === 'production'
  const today = toDateOnly(options.now ?? new Date())
  const seenSlugs = new Set<string>()

  const posts = sources.map(({ fileName, source }) => {
    if (!fileName.endsWith('.md') || fileName === 'README.md') {
      throw new Error(`Blog source must be a Markdown post: ${fileName}`)
    }

    const slug = fileName.slice(0, -3)
    validateSlug(slug, fileName)

    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate blog slug: ${slug}`)
    }
    seenSlugs.add(slug)

    const { frontmatter, content } = parseFrontmatter(source, fileName)
    const post = buildPost(slug, frontmatter, content, fileName)

    if (production && post.publishedAt > today) {
      throw new Error(
        `Future publication date is not allowed in production: ${fileName} (${post.publishedAt})`,
      )
    }

    return post
  })

  return posts
    .filter((post) => !post.draft && post.publishedAt <= today)
    .sort((a, b) => {
      const dateOrder = b.publishedAt.localeCompare(a.publishedAt)
      return dateOrder === 0 ? a.slug.localeCompare(b.slug) : dateOrder
    })
}

export function getAllBlogPosts(options: PublicationOptions = {}): BlogPost[] {
  return parseBlogSources(readBlogSources(), options)
}

export function getAllBlogPostMeta(options: PublicationOptions = {}): BlogPostMeta[] {
  return getAllBlogPosts(options).map(toPostMeta)
}

export function getBlogPost(slug: string, options: PublicationOptions = {}): BlogPost | null {
  return getAllBlogPosts(options).find((post) => post.slug === slug) ?? null
}

export function getRelatedPosts(
  currentSlug: string,
  tags: readonly string[],
  limit = 3,
  options: PublicationOptions = {},
): BlogPostMeta[] {
  return rankRelatedPosts(getAllBlogPostMeta(options), currentSlug, tags, limit)
}

export function rankRelatedPosts(
  posts: readonly BlogPostMeta[],
  currentSlug: string,
  tags: readonly string[],
  limit = 3,
): BlogPostMeta[] {
  const normalizedTags = new Set(tags.map((tag) => tag.toLowerCase()))

  return posts
    .filter((post) => post.slug !== currentSlug)
    .map((post) => ({
      post,
      score: post.tags.filter((tag) => normalizedTags.has(tag.toLowerCase())).length,
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      const dateOrder = b.post.publishedAt.localeCompare(a.post.publishedAt)
      return dateOrder === 0 ? a.post.slug.localeCompare(b.post.slug) : dateOrder
    })
    .slice(0, Math.max(0, limit))
    .map(({ post }) => post)
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

export function blogPostPath(slug: string) {
  return `/blog/${slug}`
}

export function buildBlogPostMetadata(post: BlogPost): Metadata {
  const canonical = absoluteUrl(blogPostPath(post.slug))
  const socialImage = post.image ? absoluteUrl(post.image) : absoluteUrl(OG_IMAGE.url)

  return {
    title: { absolute: `${post.title} | ${SITE_NAME}` },
    description: post.description,
    authors: [{ name: post.author }],
    alternates: { canonical },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      title: post.title,
      description: post.description,
      url: canonical,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt ?? post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      images: [
        post.image ? { url: socialImage, alt: post.imageAlt } : { ...OG_IMAGE, url: socialImage },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [socialImage],
    },
    robots: INDEXABLE_ROBOTS,
  }
}

export function buildBlogPostJsonLd(post: BlogPost) {
  const canonical = absoluteUrl(blogPostPath(post.slug))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt ?? post.publishedAt,
        author: {
          '@type': 'Person',
          name: post.author,
          jobTitle: post.authorRole,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: absoluteUrl('/'),
        },
        mainEntityOfPage: canonical,
        ...(post.image ? { image: absoluteUrl(post.image) } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: absoluteUrl('/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: absoluteUrl(BLOG_INDEX.path),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: canonical,
          },
        ],
      },
    ],
  }
}

export function blogSitemapEntries(options: PublicationOptions = {}): MetadataRoute.Sitemap {
  return getAllBlogPostMeta(options).map((post) => ({
    url: absoluteUrl(blogPostPath(post.slug)),
    lastModified: post.modifiedAt ?? post.publishedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
}

export function getInternalMarkdownLinks(content: string): string[] {
  const links: string[] = []
  const linkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+["'][^"']+["'])?\)/g

  for (const match of content.matchAll(linkPattern)) {
    const href = match[1]
    if (href.startsWith('/')) links.push(href)
  }

  return links
}

function readBlogSources(): BlogPostSource[] {
  return readdirSync(POSTS_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => ({
      fileName: entry.name,
      source: readFileSync(join(POSTS_DIRECTORY, entry.name), 'utf8'),
    }))
}

function toPostMeta(post: BlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    modifiedAt: post.modifiedAt,
    author: post.author,
    authorRole: post.authorRole,
    tags: post.tags,
    primaryIntent: post.primaryIntent,
    image: post.image,
    imageAlt: post.imageAlt,
    draft: post.draft,
    readingTimeMinutes: post.readingTimeMinutes,
    readingTime: post.readingTime,
  }
}

function parseFrontmatter(
  source: string,
  fileName: string,
): { frontmatter: Frontmatter; content: string } {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')

  if (!normalized.startsWith('---\n')) {
    throw new Error(`Missing frontmatter in ${fileName}`)
  }

  const end = normalized.indexOf('\n---\n', 4)
  if (end === -1) {
    throw new Error(`Unclosed frontmatter in ${fileName}`)
  }

  const block = normalized.slice(4, end)
  const content = normalized.slice(end + 5).trim()
  const frontmatter: Frontmatter = {}

  for (const [index, line] of block.split('\n').entries()) {
    if (!line.trim()) continue
    const separator = line.indexOf(':')
    if (separator < 1) {
      throw new Error(`Invalid frontmatter line ${index + 1} in ${fileName}`)
    }

    const key = line.slice(0, separator).trim()
    if (key in frontmatter) {
      throw new Error(`Duplicate frontmatter field "${key}" in ${fileName}`)
    }

    frontmatter[key] = parseValue(line.slice(separator + 1).trim(), key, fileName)
  }

  if (!content) throw new Error(`Blog content cannot be empty: ${fileName}`)

  return { frontmatter, content }
}

function parseValue(value: string, key: string, fileName: string): FrontmatterValue {
  if (value === 'true') return true
  if (value === 'false') return false

  if (value.startsWith('[') && value.endsWith(']')) {
    const values = value
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item.trim()))
      .filter(Boolean)
    if (values.length === 0) throw new Error(`Empty array field "${key}" in ${fileName}`)
    return values
  }

  const parsed = unquote(value)
  if (!parsed) throw new Error(`Empty frontmatter field "${key}" in ${fileName}`)
  return parsed
}

function unquote(value: string) {
  const first = value[0]
  const last = value[value.length - 1]
  return (first === '"' && last === '"') || (first === "'" && last === "'")
    ? value.slice(1, -1)
    : value
}

function buildPost(
  slug: string,
  frontmatter: Frontmatter,
  content: string,
  fileName: string,
): BlogPost {
  const title = requiredString(frontmatter, 'title', fileName)
  const description = requiredString(frontmatter, 'description', fileName)
  const publishedAt = requiredDate(frontmatter, 'publishedAt', fileName)
  const modifiedAt = optionalDate(frontmatter, 'modifiedAt', fileName)
  const author = requiredString(frontmatter, 'author', fileName)
  const authorRole = requiredString(frontmatter, 'authorRole', fileName)
  const tags = requiredStringArray(frontmatter, 'tags', fileName)
  const primaryIntent = requiredString(frontmatter, 'primaryIntent', fileName)
  const draft = requiredBoolean(frontmatter, 'draft', fileName)
  const image = optionalString(frontmatter, 'image', fileName)
  const imageAlt = optionalString(frontmatter, 'imageAlt', fileName)

  if (modifiedAt && modifiedAt < publishedAt) {
    throw new Error(`modifiedAt cannot precede publishedAt in ${fileName}`)
  }
  if (Boolean(image) !== Boolean(imageAlt)) {
    throw new Error(`image and imageAlt must be provided together in ${fileName}`)
  }
  if (image && !image.startsWith('/blog/')) {
    throw new Error(`Blog images must live under /public/blog in ${fileName}`)
  }

  const readingTimeMinutes = estimateReadingTime(content)
  return {
    slug,
    title,
    description,
    publishedAt,
    modifiedAt,
    author,
    authorRole,
    tags,
    primaryIntent,
    image,
    imageAlt,
    draft,
    content,
    readingTimeMinutes,
    readingTime: `${readingTimeMinutes} min read`,
  }
}

function requiredString(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = frontmatter[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing or invalid frontmatter field "${key}" in ${fileName}`)
  }
  return value.trim()
}

function optionalString(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = frontmatter[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid frontmatter field "${key}" in ${fileName}`)
  }
  return value.trim()
}

function requiredStringArray(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = frontmatter[key]
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !item.trim())) {
    throw new Error(`Missing or invalid frontmatter field "${key}" in ${fileName}`)
  }
  return [...new Set(value.map((item) => item.trim()))]
}

function requiredBoolean(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = frontmatter[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Missing or invalid frontmatter field "${key}" in ${fileName}`)
  }
  return value
}

function requiredDate(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = requiredString(frontmatter, key, fileName)
  validateDate(value, key, fileName)
  return value
}

function optionalDate(frontmatter: Frontmatter, key: string, fileName: string) {
  const value = optionalString(frontmatter, key, fileName)
  if (value) validateDate(value, key, fileName)
  return value
}

function validateDate(value: string, key: string, fileName: string) {
  if (!DATE_PATTERN.test(value) || toDateOnly(new Date(`${value}T00:00:00.000Z`)) !== value) {
    throw new Error(`Invalid ${key} date in ${fileName}: ${value}`)
  }
}

function validateSlug(slug: string, fileName: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid filename slug in ${fileName}`)
  }
}

function estimateReadingTime(content: string) {
  const plainText = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?(?:\[[^\]]*\])\([^)]*\)/g, ' ')
    .replace(/[#>*_~|-]/g, ' ')
  const words = plainText.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

function toDateOnly(date: Date) {
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}
