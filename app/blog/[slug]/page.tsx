import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { BrandMark } from '@/components/brand/BrandMark'
import { BlogCard } from '@/components/blog/BlogCard'
import { MarkdownContent } from '@/components/blog/MarkdownContent'
import { JsonLd } from '@/components/seo/JsonLd'
import { PillButton } from '@/components/ui/pill-button'
import {
  blogPostPath,
  buildBlogPostJsonLd,
  buildBlogPostMetadata,
  formatPostDate,
  getAllBlogPostMeta,
  getBlogPost,
  getRelatedPosts,
} from '@/lib/blog'

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return getAllBlogPostMeta().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    return {
      title: 'Article not found | Qtable',
      robots: { index: false, follow: false },
    }
  }

  return buildBlogPostMetadata(post)
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) notFound()

  const relatedPosts = getRelatedPosts(post.slug, post.tags, 3)

  return (
    <div className="bg-background text-foreground min-h-screen">
      <JsonLd data={buildBlogPostJsonLd(post)} />
      <header className="bg-background/90 border-cream-line border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="md" />
          </Link>
          <PillButton asChild variant="primary" size="default">
            <Link href="/onboarding">
              Create a menu
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </PillButton>
        </div>
      </header>

      <main>
        <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 md:py-20">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to the blog
          </Link>

          <header className="border-cream-line mt-10 border-b pb-10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="bg-card rounded-full px-3 py-1.5 text-xs font-medium">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="mt-7 text-5xl leading-[1] font-semibold tracking-[-0.04em] sm:text-6xl">
              {post.title}
            </h1>
            <p className="text-muted-foreground mt-6 text-xl leading-8">{post.description}</p>
            <div className="text-muted-foreground mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <span>
                By {post.author}, {post.authorRole}
              </span>
              <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
              {post.modifiedAt ? (
                <span>
                  Updated <time dateTime={post.modifiedAt}>{formatPostDate(post.modifiedAt)}</time>
                </span>
              ) : null}
              <span>{post.readingTime}</span>
            </div>
          </header>

          {post.image ? (
            <Image
              src={post.image}
              alt={post.imageAlt ?? ''}
              width={1200}
              height={675}
              priority
              className="border-cream-line mt-10 h-auto w-full rounded-[28px] border object-cover"
            />
          ) : null}

          <MarkdownContent content={post.content} />

          <aside className="bg-foreground text-background mt-14 rounded-[28px] p-7 sm:p-9">
            <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
              Start with the menu you have
            </p>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.02em]">
              Turn your menu photo into a reviewable first draft.
            </h2>
            <p className="text-background/75 mt-4 max-w-xl leading-7">
              Upload a photo, PDF, website link, or pasted text. Review every dish and price before
              your menu goes live.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PillButton asChild variant="accent" size="lg">
                <Link href="/onboarding">
                  Import your menu
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </PillButton>
              <PillButton
                asChild
                variant="ghost"
                size="lg"
                className="border-background text-background hover:bg-background/10 hover:text-background"
              >
                <Link href="/blog">Browse all guides</Link>
              </PillButton>
            </div>
          </aside>
        </article>

        {relatedPosts.length > 0 ? (
          <section className="bg-card/55 border-cream-line border-t px-[clamp(20px,5vw,80px)] py-16">
            <div className="mx-auto max-w-[1240px]">
              <h2 className="text-3xl font-semibold tracking-[-0.02em]">Keep reading</h2>
              <div className="mt-7 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="px-[clamp(20px,5vw,80px)] py-10">
        <div className="text-muted-foreground mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm">
          <span>Qtable guides for clearer restaurant menus.</span>
          <Link href={blogPostPath(post.slug)} aria-current="page">
            Permanent link
          </Link>
        </div>
      </footer>
    </div>
  )
}
