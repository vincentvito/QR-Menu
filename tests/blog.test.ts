import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownContent } from '../components/blog/MarkdownContent'
import {
  BLOG_INDEX,
  blogPostPath,
  blogSitemapEntries,
  buildBlogPostJsonLd,
  buildBlogPostMetadata,
  getAllBlogPosts,
  getBlogPost,
  getInternalMarkdownLinks,
  parseBlogSources,
  rankRelatedPosts,
  type BlogPost,
  type BlogPostMeta,
  type BlogPostSource,
} from '../lib/blog'
import { absoluteUrl, getAcquisitionRoute } from '../lib/seo'

const NOW = new Date('2026-08-08T12:00:00.000Z')

function source(
  fileName: string,
  overrides: Partial<{
    title: string
    description: string
    publishedAt: string
    modifiedAt: string
    author: string
    authorRole: string
    tags: string[]
    primaryIntent: string
    image: string
    imageAlt: string
    draft: boolean
    content: string
  }> = {},
): BlogPostSource {
  const data = {
    title: 'A useful restaurant menu guide',
    description: 'A precise description of this practical restaurant menu guide.',
    publishedAt: '2026-08-07',
    author: 'Qtable Product Team',
    authorRole: 'Restaurant menu workflow reviewers',
    tags: ['QR menus', 'menu operations'],
    primaryIntent: 'prepare a restaurant menu',
    draft: false,
    content: 'Useful guidance for restaurant owners. '.repeat(230),
    ...overrides,
  }
  const optional = [
    data.modifiedAt ? `modifiedAt: ${data.modifiedAt}` : '',
    data.image ? `image: ${data.image}` : '',
    data.imageAlt ? `imageAlt: ${data.imageAlt}` : '',
  ].filter(Boolean)

  return {
    fileName,
    source: `---
title: ${data.title}
description: ${data.description}
publishedAt: ${data.publishedAt}
${optional.join('\n')}
author: ${data.author}
authorRole: ${data.authorRole}
tags: [${data.tags.join(', ')}]
primaryIntent: ${data.primaryIntent}
draft: ${data.draft}
---

${data.content}`,
  }
}

test('valid frontmatter is typed, dated, and assigned reading time', () => {
  const [post] = parseBlogSources(
    [
      source('valid-post.md', {
        modifiedAt: '2026-08-08',
        image: '/blog/valid-post.jpg',
        imageAlt: 'A phone scanning a restaurant menu QR code',
        content: 'word '.repeat(230),
      }),
    ],
    { production: true, now: NOW },
  )

  assert.equal(post.slug, 'valid-post')
  assert.equal(post.modifiedAt, '2026-08-08')
  assert.equal(post.imageAlt, 'A phone scanning a restaurant menu QR code')
  assert.equal(post.readingTimeMinutes, 2)
  assert.equal(post.readingTime, '2 min read')
})

test('invalid, missing, duplicate, and empty frontmatter fails loudly', () => {
  const valid = source('valid.md')

  assert.throws(
    () => parseBlogSources([{ fileName: 'missing.md', source: 'No frontmatter' }]),
    /Missing frontmatter/,
  )
  assert.throws(
    () =>
      parseBlogSources([
        { ...valid, source: valid.source.replace('publishedAt: 2026-08-07', 'publishedAt: nope') },
      ]),
    /Invalid publishedAt date/,
  )
  assert.throws(
    () =>
      parseBlogSources([
        { ...valid, source: valid.source.replace('author: Qtable Product Team\n', '') },
      ]),
    /frontmatter field "author"/,
  )
  assert.throws(() => parseBlogSources([valid, valid]), /Duplicate blog slug/)
  assert.throws(
    () => parseBlogSources([{ ...valid, source: valid.source.replace(/\nUseful[\s\S]+$/, '\n') }]),
    /content cannot be empty/,
  )
  assert.throws(
    () => parseBlogSources([source('bad-image.md', { image: '/blog/photo.jpg' })]),
    /image and imageAlt/,
  )
})

test('drafts are excluded and future production dates fail the build contract', () => {
  const posts = parseBlogSources([source('live.md'), source('draft.md', { draft: true })], {
    production: true,
    now: NOW,
  })
  assert.deepEqual(
    posts.map((post) => post.slug),
    ['live'],
  )

  assert.throws(
    () =>
      parseBlogSources([source('future.md', { publishedAt: '2026-08-09' })], {
        production: true,
        now: NOW,
      }),
    /Future publication date is not allowed in production/,
  )
})

test('published posts sort newest first with a deterministic slug tie-break', () => {
  const posts = parseBlogSources(
    [source('z-last.md', { publishedAt: '2026-08-06' }), source('b-tie.md'), source('a-tie.md')],
    { production: true, now: NOW },
  )

  assert.deepEqual(
    posts.map((post) => post.slug),
    ['a-tie', 'b-tie', 'z-last'],
  )
})

test('related posts exclude the current article and rank shared tags before recency', () => {
  const posts = parseBlogSources(
    [
      source('current.md', { tags: ['photos', 'QR menus'] }),
      source('older-match.md', { tags: ['photos'], publishedAt: '2026-08-01' }),
      source('new-no-match.md', { tags: ['pricing'], publishedAt: '2026-08-07' }),
      source('best-match.md', { tags: ['photos', 'QR menus'], publishedAt: '2026-08-02' }),
    ],
    { production: true, now: NOW },
  )
  const meta = posts.map(({ content, ...post }) => {
    assert.ok(content.length > 0)
    return post
  })
  const related = rankRelatedPosts(meta, 'current', ['photos', 'QR menus'], 3)

  assert.deepEqual(
    related.map((post) => post.slug),
    ['best-match', 'older-match', 'new-no-match'],
  )
  assert.ok(!related.some((post) => post.slug === 'current'))
})

test('raw HTML is inert while internal and external Markdown links stay safe', () => {
  const html = renderToStaticMarkup(
    createElement(MarkdownContent, {
      content:
        '<script>globalThis.compromised = true</script>\n\n[Internal](/onboarding)\n\n[External](https://example.com)',
    }),
  )

  assert.ok(!html.includes('<script'))
  assert.ok(!html.includes('globalThis.compromised'))
  assert.match(html, /href="\/onboarding"/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noopener noreferrer"/)
})

test('pilot internal links are absolute-path links to live routes', () => {
  const [pilot] = getAllBlogPosts({ production: true, now: NOW })
  const links = getInternalMarkdownLinks(pilot.content)

  assert.ok(links.length >= 2)
  assert.ok(links.every((href) => href === '/onboarding'))
})

test('metadata, canonical, JSON-LD, and sitemap use the same article URL and dates', () => {
  const post = getBlogPost('turn-menu-photo-into-digital-menu', {
    production: true,
    now: NOW,
  }) as BlogPost
  const canonical = absoluteUrl(blogPostPath(post.slug))
  const metadata = buildBlogPostMetadata(post)
  const schema = buildBlogPostJsonLd(post)
  const article = schema['@graph'][0] as { '@id': string; mainEntityOfPage: string }
  const breadcrumb = schema['@graph'][1] as {
    itemListElement: { item: string }[]
  }
  const sitemap = blogSitemapEntries({ production: true, now: NOW })
  const entry = sitemap.find((candidate) => candidate.url === canonical)

  assert.equal(String(metadata.alternates?.canonical), canonical)
  assert.equal(article['@id'], `${canonical}#article`)
  assert.equal(article.mainEntityOfPage, canonical)
  assert.equal(breadcrumb.itemListElement.at(-1)?.item, canonical)
  assert.equal(entry?.lastModified, post.publishedAt)
})

test('the blog index registry is canonical and unknown posts remain unavailable', () => {
  const route = getAcquisitionRoute('/blog')
  assert.equal(route.path, BLOG_INDEX.path)
  assert.equal(route.title, BLOG_INDEX.title)
  assert.equal(route.description, BLOG_INDEX.description)
  assert.equal(getBlogPost('does-not-exist', { production: true, now: NOW }), null)

  const pageSource = readFileSync(new URL('../app/blog/[slug]/page.tsx', import.meta.url), 'utf8')
  assert.match(pageSource, /if \(!post\) notFound\(\)/)
  assert.match(pageSource, /getRelatedPosts\(post\.slug, post\.tags, 3\)/)
})

test('publication metadata and cards do not expose draft fields or content', () => {
  const meta: BlogPostMeta[] = getAllBlogPosts({ production: true, now: NOW }).map(
    ({ content, ...post }) => {
      assert.ok(content.length > 0)
      return post
    },
  )
  assert.ok(meta.every((post) => !post.draft))
  assert.ok(meta.every((post) => !('content' in post)))
})
