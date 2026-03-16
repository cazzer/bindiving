import { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const STORE_NAME = 'search-results'

export default async function getResultHandler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }

  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')?.trim()
  if (!slug) {
    return new Response(JSON.stringify({ error: 'slug query required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const store = getStore({ name: STORE_NAME })
  const payloadKey = await store.get(`slug-index/${slug}`)
  if (!payloadKey || typeof payloadKey !== 'string') {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  const payload = await store.get(payloadKey)
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }

  const data = typeof payload === 'string' ? JSON.parse(payload) : payload
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config: Config = {
  path: '/api/result'
}
