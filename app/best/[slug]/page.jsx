import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { notFound } from 'next/navigation'

import BestPageContent from './BestPageContent'
import { getWebPageJsonLd } from '../../lib/structured-data'

export const runtime = 'nodejs'

const CONTENT_DIR = join(process.cwd(), 'content', 'static-queries')

function getSlugs() {
  if (!existsSync(CONTENT_DIR)) return []
  const files = readdirSync(CONTENT_DIR, { withFileTypes: true })
  return files.filter((f) => f.isFile() && f.name.endsWith('.json')).map((f) => f.name.replace(/\.json$/, ''))
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i

function loadPayload(slug) {
  if (!SAFE_SLUG.test(slug)) return null
  const path = join(CONTENT_DIR, `${slug}.json`)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw)
}

export async function generateStaticParams() {
  const slugs = getSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await Promise.resolve(params)
  const payload = loadPayload(slug)
  if (!payload) return { title: 'Not found' }
  return {
    title: payload.title,
    description: payload.description,
    openGraph: {
      title: payload.title,
      description: payload.description
    },
    twitter: {
      title: payload.title,
      description: payload.description
    }
  }
}

export default async function BestSlugPage({ params }) {
  const { slug } = await Promise.resolve(params)
  const payload = loadPayload(slug)
  if (!payload) notFound()

  const { query, recommendations, resolvedLinks, dugAt } = payload

  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getWebPageJsonLd({
              url: `https://bindiving.com/best/${slug}`,
              title: payload.title,
              description: payload.description,
              query
            })
          )
        }}
      />
      <BestPageContent query={query} recommendations={recommendations} resolvedLinks={resolvedLinks} dugAt={dugAt} />
    </main>
  )
}
