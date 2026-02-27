'use client'

import { useEffect, useRef } from 'react'
import posthog from 'posthog-js'

import ProductCard from '../components/product-card'
import PillSearchBar from '../components/pill-search-bar'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'
import { Footer } from 'components/footer'
import { useRecommendations } from '../contexts/recommendations-context'

const PLACEHOLDER_LIST = [
  `blister-proof running socks`,
  `extra durable plunger`,
  `hotel-quality pillows`,
  `flowers that don't need water`,
  `bluetooth typewriter`,
  `toe-less socks for sweaty feet`,
  `dark lightbulbs`,
  `annoyingly loud headphones`,
  `dress shoes without soles`,
  `dog leash but for children`,
  `helium-filled dumbbells`,
  `invisible bookshelf`,
  `banana slicer for one`,
  `anti-pigeon spikes for your hat`,
  `portable hole`,
  `left-handed spatula`,
  `emergency inflatable crown`,
  `unnecessarily large spoon`,
  `screaming goat soap dispenser`,
  `nose trimmer for dogs`,
  `gothic fairy garden gnome`,
  `single chopstick`,
  `mood ring for your fridge`,
  `edible candle`
]

// Seeded shuffle so order is random but deterministic (same on SSR and client = no flash). Seed by UTC minute so refreshes after a minute get new order.
function seededShuffle(arr, seed) {
  const out = [...arr]
  let s = seed
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const MINUTE_SEED = typeof Date !== 'undefined' ? Math.floor(Date.now() / 60000) : 0
const PLACEHOLDERS = seededShuffle(PLACEHOLDER_LIST, MINUTE_SEED)
const SUGGESTED = PLACEHOLDERS.slice(0, 4)

export default function Page() {
  const {
    query,
    status,
    recommendations,
    error,
    streamStatus,
    search,
    getMoreOptions,
    updateQuery,
    setSearchProps
  } = useRecommendations()

  const onSearchRef = useRef(null)

  // Sync search props for header
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSearchProps({
        query,
        onQueryUpdate: updateQuery,
        onSubmit: (e) => onSearchRef.current?.(e),
        placeholder: 'Search again...'
      })
    })
    return () => cancelAnimationFrame(id)
  }, [query, updateQuery, setSearchProps])

  async function handleSearch(event, queryOverride) {
    event?.preventDefault?.()
    const searchQuery = queryOverride !== undefined ? queryOverride : query
    await search(searchQuery, queryOverride !== undefined)
  }

  onSearchRef.current = handleSearch

  const isSearching = status === 'searching'
  const hasError = status === 'error'
  const hasResults = recommendations.length > 0

  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
      {isSearching && !hasResults ? (
        <Digging streamStatus={streamStatus} />
      ) : (
        <>
          {!hasResults && (
            <section className="flex flex-col items-center gap-6 text-center">
              <PillSearchBar
                size="hero"
                value={query}
                onChange={updateQuery}
                onSubmit={handleSearch}
                placeholders={PLACEHOLDERS}
                autoFocus
              />
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-base-content/70 font-display">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        posthog.capture('suggested_search_clicked', { term })
                        onSearchRef.current?.({ preventDefault: () => {} }, term)
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-[var(--retro-border)] bg-base-100 hover:bg-base-200 transition-colors font-display"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      
      {hasError && !isSearching && <ErrorResponseParser valid={false} message={error?.message} />}
      
      {hasResults && (
        <section className="flex flex-col gap-4">
          <em className="mb-1 block text-center">
            Results are AI generated and may contain fabricated statements and broken links.
          </em>
          {recommendations.map((product) => (
            <ProductCard product={product} key={product._id} />
          ))}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              type="button"
              onClick={getMoreOptions}
              disabled={isSearching}
              className="btn btn-outline btn-primary"
            >
              Give me more options
            </button>
            {isSearching && <Digging streamStatus={streamStatus} />}
            <Footer />
          </div>
        </section>
      )}
    </main>
  )
}
