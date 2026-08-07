import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { blogPostPath, formatPostDate, type BlogPostMeta } from '@/lib/blog'

export function BlogCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="border-cream-line bg-background flex h-full flex-col overflow-hidden rounded-[28px] border shadow-[0_18px_45px_-32px_rgba(26,30,23,0.38)]">
      {post.image ? (
        <Image
          src={post.image}
          alt={post.imageAlt ?? ''}
          width={720}
          height={405}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div
          className="from-accent/55 via-card to-pop/25 aspect-video bg-gradient-to-br"
          aria-hidden="true"
        />
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
          <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime}</span>
        </div>
        <div
          className="mt-4 flex h-6 items-center gap-2 overflow-hidden"
          aria-label={`Topics: ${post.tags.join(', ')}`}
        >
          {post.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <h2 className="mt-5 text-2xl leading-tight font-semibold tracking-[-0.02em]">
          <Link href={blogPostPath(post.slug)} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <p className="text-muted-foreground mt-4 flex-1 text-sm leading-6">{post.description}</p>
        <Link
          href={blogPostPath(post.slug)}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"
        >
          Read guide
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
