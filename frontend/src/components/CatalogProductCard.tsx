import { MessageCircle, Search } from 'lucide-react'
import type { Product } from '../types'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { formatCatalogProductPrice } from '../utils/product'

export function CatalogProductCard({
  product,
  startingChat,
  onViewDetails,
  onChat,
}: {
  product: Product
  startingChat: boolean
  onViewDetails: (product: Product) => void
  onChat: (product: Product) => void
}) {
  const primaryImage = product.images?.find((image) => image.is_primary) || product.images?.[0]

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal"
        aria-label={`View details for ${product.name}`}
      >
        <div className="relative aspect-square overflow-hidden bg-canvas">
          {primaryImage ? (
            <img
              src={resolveMediaUrl(primaryImage.image)}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-ink-soft" aria-hidden="true">🛍️</div>
          )}
          {product.brand && (
            <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-sm">
              {product.brand}
            </span>
          )}
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-semibold text-white">
            {product.pricing_mode === 'static' ? 'Fixed price' : 'Ask for price'}
          </span>
        </div>
        <div className="px-3 pt-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink">{product.name}</h3>
          <p className="mt-1 line-clamp-1 text-base font-bold text-ink">{formatCatalogProductPrice(product)}</p>
        </div>
      </button>
      <div className="flex gap-2 p-3 pt-2">
        <button
          type="button"
          onClick={() => onViewDetails(product)}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-2 text-xs font-semibold text-ink transition hover:bg-canvas"
        >
          <Search size={14} aria-hidden="true" /> Details
        </button>
        <button
          type="button"
          onClick={() => onChat(product)}
          disabled={startingChat}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal px-2 text-xs font-semibold text-white transition hover:bg-teal/90 disabled:cursor-wait disabled:opacity-60"
        >
          <MessageCircle size={14} aria-hidden="true" />
          {startingChat ? 'Opening…' : 'Chat'}
        </button>
      </div>
    </article>
  )
}
