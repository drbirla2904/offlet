import { useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HorizontalRail({
  title,
  subtitle,
  viewAllHref,
  ariaLabel,
  children,
}: {
  title: string
  subtitle?: string
  viewAllHref?: string
  ariaLabel: string
  children: ReactNode
}) {
  const railRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.8, 240), behavior: 'smooth' })
  }

  return (
    <section className="mt-6" aria-label={ariaLabel}>
      <div className="mb-2 flex items-end justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewAllHref && <Link to={viewAllHref} className="text-xs font-semibold text-teal hover:underline">View all</Link>}
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={`Scroll ${title} left`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:bg-canvas"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={`Scroll ${title} right`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:bg-canvas"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  )
}
