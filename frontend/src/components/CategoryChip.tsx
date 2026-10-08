import { Link } from 'react-router-dom'
import type { Category } from '../types'

export function CategoryChip({ category }: { category: Category }) {
  return (
    <Link
      to={`/search?category=${category.id}`}
      className="flex w-16 shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl py-1"
    >
      <div className="w-14 h-14 rounded-2xl bg-marigold-soft flex items-center justify-center text-2xl">
        {category.icon || '🛍️'}
      </div>
      <span className="text-[11px] text-ink-soft text-center line-clamp-2">{category.name}</span>
    </Link>
  )
}
