'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Footer } from '../../../components/footer'
import { useRecommendations } from '../../../contexts/recommendations-context'

const ProductCard = dynamic(() => import('../../../components/product-card'), { ssr: false })

function formatDugAt(isoString) {
  if (!isoString) return null
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return null
  }
}

export default function BestPageContent({ query, recommendations, resolvedLinks, dugAt }) {
  const dugAtFormatted = formatDugAt(dugAt)
  const router = useRouter()
  const { setQuery, updateQuery, setSearchProps } = useRecommendations()

  useEffect(() => {
    // Prepopulate the shared header search bar with this prebaked query.
    setQuery(query)
    setSearchProps({
      query,
      onQueryUpdate: updateQuery,
      onSubmit: (e) => {
        e?.preventDefault?.()
        // PillSearchBar submits the <form>, so read the latest value from the input.
        const form = e?.currentTarget
        const input = form?.querySelector?.('input[type="text"]')
        const q = input?.value?.trim()
        if (q) router.push(`/?q=${encodeURIComponent(q)}`)
        else router.push('/')
      },
      placeholder: 'Search again...'
    })
  }, [query, router, setQuery, updateQuery, setSearchProps])

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-base-content/70 text-center">
        Pre-dug recommendations for <em>{query}</em>.
      </p>
      {recommendations.map((product) => (
        <ProductCard
          key={product.product_name + (product.amazon_id ?? '')}
          product={{ _resolved: product, _resolveStatus: 'resolved' }}
          resolvedLinks={resolvedLinks}
        />
      ))}
      <div className="flex flex-col items-center gap-2 pt-4">
        {dugAtFormatted && <p className="text-xs text-base-content/50">Dug at {dugAtFormatted}</p>}
        <Link href={`/?q=${encodeURIComponent(query)}`} className="btn btn-outline btn-primary btn-sm">
          Give me more options
        </Link>
        <Footer />
      </div>
    </section>
  )
}
