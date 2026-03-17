'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PillSearchBar from '../../../components/pill-search-bar'

export default function ResultsPageSearchBar({ initialQuery }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery ?? '')

  function handleSubmit(e) {
    e?.preventDefault?.()
    const q = (query ?? '').trim()
    if (q) router.push(`/?q=${encodeURIComponent(q)}`)
    else router.push('/')
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <PillSearchBar
        size="compact"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSubmit={handleSubmit}
        placeholder="Search again..."
      />
    </div>
  )
}
