import { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { nanoid } from 'nanoid'

const STORE_NAME = 'search-results'
const SLUG_LENGTH = 8

type SaveBody = {
  query?: string
  recommendations?: unknown[]
  resolvedLinks?: Record<string, { title?: string; description?: string; image?: string; url?: string }>
}

export default async function saveResultHandler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }

  let body: SaveBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  const recommendations = Array.isArray(body?.recommendations) ? body.recommendations : []
  const resolvedLinks = body?.resolvedLinks && typeof body.resolvedLinks === 'object' ? body.resolvedLinks : {}

  if (!query || recommendations.length === 0) {
    return new Response(
      JSON.stringify({ error: 'query and non-empty recommendations required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const slug = nanoid(SLUG_LENGTH)
  const dateKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const payloadKey = `results/${dateKey}/${slug}`

  const title = `Best ${query.replace(/^best\s+/i, '').trim()} | Bin Diving`
  const description = `AI-dug recommendations for ${query}. Compare options and find one that fits.`
  const payload = {
    slug,
    query,
    title,
    description,
    dugAt: new Date().toISOString(),
    recommendations,
    resolvedLinks
  }

  const store = getStore({ name: STORE_NAME })
  await store.set(payloadKey, JSON.stringify(payload))
  await store.set(`slug-index/${slug}`, payloadKey)

  return new Response(JSON.stringify({ slug }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config: Config = {
  path: '/api/save-result'
}
