'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PillSearchBar from '../components/pill-search-bar'

export default function NotFound() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e) {
    e?.preventDefault?.()
    const q = (query ?? '').trim()
    if (q) router.push(`/?q=${encodeURIComponent(q)}`)
    else router.push('/')
  }

  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
      <section className="flex flex-col items-center gap-6 text-center">
        <h2 className="font-display font-bold text-xl sm:text-2xl text-base-content">
          Page not found
        </h2>
        <p className="text-sm text-base-content/70 max-w-md">
          This link may have expired or been removed. Try searching again below or go back to the home page.
        </p>
        <div className="w-full max-w-2xl mx-auto">
          <PillSearchBar
            size="hero"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSubmit={handleSubmit}
            placeholder="What are you looking for?"
            autoFocus
          />
        </div>
        <Link href="/" className="text-sm link link-primary">
          Back to home
        </Link>
      </section>
    </main>
  )
}
