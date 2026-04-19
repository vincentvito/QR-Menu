import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewMenuForm } from '@/components/dashboard/NewMenuForm'

export default function NewMenuPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/menus"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs transition-colors"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        Back to menus
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New menu</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Import from a URL, photo, PDF, or pasted text.
        </p>
      </div>

      <NewMenuForm />
    </main>
  )
}
