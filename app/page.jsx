import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

import HomeClient from './HomeClient'

const CONTENT_DIR = join(process.cwd(), 'content', 'static-queries')
const MAX_TEASERS = 3
const MAX_EXAMPLE_LINKS = 4

function stripBestPrefix(query) {
  const s = String(query ?? '').trim()
  return s.replace(/^best\s+/i, '').trim()
}

function loadTeasers() {
  try {
    const files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.json'))
    if (files.length === 0) return []
    const shuffled = [...files]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const chosen = shuffled.slice(0, MAX_TEASERS)
    return chosen
      .map((file) => {
        const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8')
        const payload = JSON.parse(raw)
        const recs = Array.isArray(payload.recommendations) ? payload.recommendations.slice(0, 2) : []
        const firstWithImage = recs.find(
          (r) => r?.image_url || (Array.isArray(r?.images) && r.images.length > 0)
        )
        const image =
          (firstWithImage && (firstWithImage.image_url || firstWithImage.images?.[0])) || null
        return {
          slug: payload.slug,
          query: payload.query,
          recommendations: recs,
          image
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function loadExamplePrebakedLinks() {
  try {
    const files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.json'))
    if (files.length === 0) return []

    const shuffled = [...files]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const chosen = shuffled.slice(0, MAX_EXAMPLE_LINKS)

    return chosen
      .map((file) => {
        const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8')
        const payload = JSON.parse(raw)

        const slug = payload.slug ?? file.replace(/\.json$/i, '')
        const label = stripBestPrefix(payload.query)

        if (!slug || !label) return null
        return { slug, label }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

export default function Page() {
  const initialTeasers = loadTeasers()
  const suggestedBestPages = loadExamplePrebakedLinks()
  return <HomeClient initialTeasers={initialTeasers} suggestedBestPages={suggestedBestPages} />
}
