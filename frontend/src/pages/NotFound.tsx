import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="font-display text-6xl font-semibold text-teal">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-ink">We couldn’t find that page</h1>
      <p className="mt-2 text-sm text-ink-soft">The link may be outdated, or the page may have moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-10 items-center gap-2 bg-marigold px-4 text-sm font-semibold text-white"><ArrowLeft size={15} /> Home</Link>
        <Link to="/search" className="inline-flex h-10 items-center gap-2 border border-border px-4 text-sm font-semibold text-ink"><Search size={15} /> Search offers</Link>
      </div>
    </main>
  )
}