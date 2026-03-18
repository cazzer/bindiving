import { Config } from '@netlify/functions'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const CONTENT_DIR = join(process.cwd(), 'content', 'static-queries')
const MAX_TEASERS = 3

function pickRandom<T>(arr: T[], count: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, count)
}

export default async function prebakedTeasers() {
  let files: string[] = []
  try {
    files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.json'))
  } catch {
    return new Response(JSON.stringify({ teasers: [] }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const chosen = pickRandom(files, MAX_TEASERS)
  const teasers = []

  for (const file of chosen) {
    try {
      const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8')
      const payload = JSON.parse(raw) as {
        slug: string
        query: string
        title: string
        description: string
        recommendations?: Array<{
          product_name?: string
          price?: string | null
          amazon_id?: string | null
        }>
      }
      const recs = Array.isArray(payload.recommendations) ? payload.recommendations.slice(0, 2) : []
      teasers.push({
        slug: payload.slug,
        query: payload.query,
        title: payload.title,
        description: payload.description,
        recommendations: recs
      })
    } catch {
      continue
    }
  }

  return new Response(JSON.stringify({ teasers }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config: Config = {
  path: '/api/prebaked-teasers'
}

