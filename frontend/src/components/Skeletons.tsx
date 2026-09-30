export function OfferCardSkeleton() {
  return (
    <div className="w-44 sm:w-56 shrink-0 bg-surface rounded-2xl border border-border overflow-hidden">
      <div className="h-32 sm:h-36 skeleton" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 w-3/4 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
        <div className="h-3 w-2/3 rounded skeleton" />
      </div>
    </div>
  )
}

export function BusinessCardSkeleton() {
  return (
    <div className="w-40 sm:w-48 shrink-0 bg-surface rounded-2xl border border-border p-3 flex flex-col items-center">
      <div className="w-16 h-16 rounded-full skeleton mb-2" />
      <div className="h-3.5 w-3/4 rounded skeleton mb-1.5" />
      <div className="h-3 w-1/2 rounded skeleton" />
    </div>
  )
}

export function OfferRailSkeleton({ title, count = 4 }: { title: string; count?: number }) {
  return (
    <section className="mt-6" aria-busy="true" aria-label={`Loading ${title}`}>
      <div className="px-4 mb-2">
        <div className="h-5 w-40 rounded skeleton" />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {Array.from({ length: count }).map((_, i) => <OfferCardSkeleton key={i} />)}
      </div>
    </section>
  )
}
