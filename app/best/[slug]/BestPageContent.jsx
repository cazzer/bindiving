'use client'

import dynamic from 'next/dynamic'
import { Footer } from '../../../components/footer'

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

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-base-content/70 text-center">
        Pre-dug recommendations for <em>{query}</em>. Results are AI generated and may contain fabricated statements
        and broken links.
      </p>
      {recommendations.map((product) => (
        <ProductCard
          key={product.product_name + (product.amazon_id ?? '')}
          product={{ _resolved: product, _resolveStatus: 'resolved' }}
          resolvedLinks={resolvedLinks}
        />
      ))}
      <div className="flex flex-col items-center gap-2 pt-4">
        {dugAtFormatted && (
          <p className="text-xs text-base-content/50">Dug at {dugAtFormatted}</p>
        )}
        <Footer />
      </div>
    </section>
  )
}
