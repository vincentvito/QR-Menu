import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { BlogCard } from '@/components/blog/BlogCard'
import { PillButton } from '@/components/ui/pill-button'
import { getAllBlogPostMeta } from '@/lib/blog'
import { buildPageMetadata, getAcquisitionRoute } from '@/lib/seo'

export const metadata = buildPageMetadata(getAcquisitionRoute('/blog'))
export const dynamic = 'force-static'

export default function BlogPage() {
  const posts = getAllBlogPostMeta()

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-background/90 border-cream-line border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(20px,5vw,80px)] py-4">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/#resources" className="hidden text-sm font-medium sm:inline">
              FAQ
            </Link>
            <PillButton asChild variant="primary" size="default">
              <Link href="/onboarding">
                Create a menu
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </PillButton>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-[clamp(20px,5vw,80px)] py-16 md:py-24">
          <div
            className="bg-accent/35 pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-[1240px]">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Qtable
            </Link>
            <p className="text-muted-foreground mt-14 text-xs font-semibold tracking-[0.16em] uppercase">
              Qtable field notes
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl leading-[0.98] font-semibold tracking-[-0.04em] sm:text-6xl md:text-7xl">
              Better digital menus start with practical details.
            </h1>
            <p className="text-muted-foreground mt-7 max-w-2xl text-lg leading-8">
              Clear, product-reviewed guides for moving a restaurant menu from paper to a phone,
              testing the QR experience, and keeping information accurate after launch.
            </p>
          </div>
        </section>

        <section className="bg-card/55 border-cream-line border-y px-[clamp(20px,5vw,80px)] py-16 md:py-20">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-[clamp(20px,5vw,80px)] py-10">
        <div className="text-muted-foreground mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 text-sm">
          <span>Practical restaurant menu guidance from Qtable.</span>
          <div className="flex gap-5">
            <Link href="/">Home</Link>
            <Link href="/#resources">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
