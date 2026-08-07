import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-12 text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 text-3xl leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-9 text-2xl leading-tight font-semibold tracking-[-0.01em]">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-muted-foreground mt-5 text-[17px] leading-8">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="text-muted-foreground mt-5 list-disc space-y-2 pl-6 text-[17px] leading-8">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-muted-foreground mt-5 list-decimal space-y-3 pl-6 text-[17px] leading-8">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-accent bg-card mt-8 rounded-r-2xl border-l-4 px-6 py-1">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    if (!href) return <span>{children}</span>

    const className =
      'text-foreground decoration-accent font-medium underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70'

    if (href.startsWith('/') && !href.startsWith('//')) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      )
    }

    if (href.startsWith('#') || href.startsWith('mailto:')) {
      return (
        <a href={href} className={className}>
          {children}
        </a>
      )
    }

    if (!/^https?:\/\//i.test(href)) return <span>{children}</span>

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-foreground text-background mt-7 overflow-x-auto rounded-2xl p-5 text-sm leading-6">
      {children}
    </pre>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="bg-card text-foreground rounded px-1.5 py-0.5 text-[0.9em]">{children}</code>
    ),
  table: ({ children }) => (
    <div className="border-cream-line mt-8 overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-card text-foreground">{children}</thead>,
  th: ({ children }) => (
    <th className="border-cream-line border-b px-4 py-3 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-cream-line text-muted-foreground border-b px-4 py-3 align-top last:border-b-0">
      {children}
    </td>
  ),
  hr: () => <hr className="border-cream-line my-10" />,
  img: ({ src, alt }) => {
    if (typeof src !== 'string' || !src.startsWith('/blog/')) {
      throw new Error('Markdown images must use a /blog/ path from public/blog')
    }
    if (!alt?.trim()) throw new Error(`Markdown image is missing alt text: ${src}`)

    return (
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        className="border-cream-line mt-8 h-auto w-full rounded-2xl border object-cover"
      />
    )
  },
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="mt-10">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  )
}
