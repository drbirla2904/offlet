import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoriesApi } from '../api/endpoints'
import type { Category } from '../types'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    categoriesApi.list().then(setCategories)
  }, [])

  return (
    <div className="pb-24 sm:pb-8 max-w-3xl mx-auto px-4 pt-4">
      <h1 className="font-display text-2xl font-semibold text-ink mb-4">Categories</h1>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {categories.map((c) => (
          <Link key={c.id} to={`/search?category=${c.id}`} className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-marigold-soft flex items-center justify-center text-2xl">{c.icon || '🛍️'}</div>
            <span className="text-xs text-ink-soft">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
