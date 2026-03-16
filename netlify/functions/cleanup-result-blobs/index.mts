import { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const STORE_NAME = 'search-results'
const RETENTION_DAYS = Number(process.env.RESULT_BLOB_RETENTION_DAYS) || 30

export default async function cleanupResultBlobs() {
  const store = getStore({ name: STORE_NAME })
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10) // YYYY-MM-DD

  const { blobs } = await store.list({ prefix: 'results/' })
  let deleted = 0

  for (const blob of blobs) {
    const key = blob.key
    // key = results/YYYY-MM-DD/slug
    const parts = key.split('/')
    if (parts.length !== 3 || parts[0] !== 'results') continue
    const dateStr = parts[1]
    const slug = parts[2]
    if (dateStr < cutoffStr) {
      await store.delete(key)
      await store.delete(`slug-index/${slug}`)
      deleted++
    }
  }

  console.log(`cleanup-result-blobs: deleted ${deleted} result(s) older than ${RETENTION_DAYS} days`)
  return new Response(JSON.stringify({ deleted }), { headers: { 'Content-Type': 'application/json' } })
}

export const config: Config = {
  // Scheduled only (no custom path allowed for scheduled functions)
}
