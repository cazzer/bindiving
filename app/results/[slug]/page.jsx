import { notFound } from 'next/navigation'

import BestPageContent from '../../best/[slug]/BestPageContent'
import ResultsPageSearchBar from './ResultsPageSearchBar'

const FETCH_TIMEOUT_MS = 10000

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.URL) return process.env.URL
  if (process.env.NODE_ENV === 'development') return 'http://localhost:8888'
  return 'https://bindiving.com'
}

async function fetchResult(slug) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${getBaseUrl()}/api/result?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal
    })
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { slug } = await Promise.resolve(params)
  const res = await fetchResult(slug)
  if (!res.ok) return { title: 'Not found' }
  const payload = await res.json()
  return {
    title: payload.title,
    description: payload.description,
    openGraph: { title: payload.title, description: payload.description },
    twitter: { title: payload.title, description: payload.description }
  }
}

export default async function ResultPage({ params }) {
  const { slug } = await Promise.resolve(params)
  const res = await fetchResult(slug)
  if (!res.ok) notFound()

  const payload = await res.json()
  const { query, recommendations, resolvedLinks, dugAt } = payload

  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
      <ResultsPageSearchBar initialQuery={query} />
      <BestPageContent query={query} recommendations={recommendations} resolvedLinks={resolvedLinks ?? {}} dugAt={dugAt} />
    </main>
  )
}
