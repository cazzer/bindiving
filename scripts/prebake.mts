/**
 * Prebake static query pages: run search → resolve products → resolve link previews → write JSON.
 * Run from repo root:
 *   npm run prebake                                    # run all entries in scripts/prebake-queries.json
 *   npm run prebake -- <slug> "<search term>"          # run one, e.g. prebake -- camping-chairs "best lightweight camping chairs"
 * Requires: OPEN_AI_KEY (and any env needed by product resolvers).
 */

import 'dotenv/config'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { runSearch } from '../netlify/functions/recommendations/run-search.mts'
import { parseRecommendations } from '../netlify/functions/recommendations/parse-output.mts'
import { resolveRecommendations } from '../netlify/functions/recommendations/resolve-recommendations.mts'
import { getLinkPreview, type LinkPreviewMeta } from '../netlify/functions/recommendations/get-link-preview.mts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const QUERIES_PATH = join(ROOT, 'scripts', 'prebake-queries.json')
const OUT_DIR = join(ROOT, 'content', 'static-queries')
const LLM_PATH = join(ROOT, 'public', 'llm.txt')
const SITEMAP_PATH = join(ROOT, 'public', 'sitemap.xml')

type QueryEntry = string | { query: string; slug?: string; title?: string; description?: string }

type StaticQueryPayload = {
  slug: string
  query: string
  title: string
  description: string
  dugAt: string
  recommendations: unknown[]
  resolvedLinks: Record<string, LinkPreviewMeta>
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'query'
  )
}

function defaultTitle(query: string): string {
  return `Best ${query.replace(/^best\s+/i, '').trim()} | Bin Diving`
}

function defaultDescription(query: string): string {
  return `AI-dug recommendations for ${query}. Compare options and find one that fits.`
}

function loadQueries(): QueryEntry[] {
  const raw = readFileSync(QUERIES_PATH, 'utf-8')
  const arr = JSON.parse(raw)
  if (!Array.isArray(arr)) throw new Error('prebake-queries.json must be an array')
  return arr
}

function normalizeEntry(entry: QueryEntry): { query: string; slug?: string; title?: string; description?: string } {
  if (typeof entry === 'string') return { query: entry }
  if (entry && typeof entry.query === 'string') return entry
  throw new Error('Each entry must be a string or { query: string, slug?, title?, description? }')
}

async function resolveLinksForSources(sources: string[]): Promise<Record<string, LinkPreviewMeta>> {
  const deduped = [...new Set(sources.filter((u) => u?.startsWith('http')))]
  const out: Record<string, LinkPreviewMeta> = {}
  for (const url of deduped) {
    try {
      out[url] = await getLinkPreview(url)
    } catch (err) {
      console.warn(`  [link-preview] ${url}: ${err instanceof Error ? err.message : err}`)
    }
  }
  return out
}

const prebakedUrls: string[] = []

async function runOne(entry: QueryEntry): Promise<void> {
  const { query, slug: slugOverride, title: titleOverride, description: descriptionOverride } = normalizeEntry(entry)
  const slug = slugOverride ?? slugify(query)
  const title = titleOverride ?? defaultTitle(query)
  const description = descriptionOverride ?? defaultDescription(query)

  console.log(`[${slug}] runSearch...`)
  const { outputText } = await runSearch(query)

  const rawRecs = parseRecommendations(outputText)
  if (rawRecs.length === 0) {
    console.warn(`[${slug}] no recommendations parsed, skipping`)
    return
  }

  console.log(`[${slug}] resolveRecommendations (${rawRecs.length})...`)
  const result = await resolveRecommendations(rawRecs)
  if (!result.valid) {
    console.warn(`[${slug}] resolve failed: ${result.message}, skipping`)
    return
  }

  const allSources = result.recommendations.flatMap((r) => r.sources ?? [])
  console.log(`[${slug}] resolveLinks (${allSources.length} URLs)...`)
  const resolvedLinks = await resolveLinksForSources(allSources)

  const payload: StaticQueryPayload = {
    slug,
    query,
    title,
    description,
    dugAt: new Date().toISOString(),
    recommendations: result.recommendations,
    resolvedLinks
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const outPath = join(OUT_DIR, `${slug}.json`)
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`[${slug}] wrote ${outPath}`)

  const url = `https://bindiving.com/best/${slug}`
  prebakedUrls.push(url)
}

function ensureLlmEntries(urls: string[]): void {
  let content = ''
  if (existsSync(LLM_PATH)) {
    content = readFileSync(LLM_PATH, 'utf-8')
  } else {
    content =
      'site: https://bindiving.com\n\n' +
      'allow: /\n' +
      'disallow: /api/\n' +
      'disallow: /_next/\n\n' +
      '# Core pages\n' +
      'page: https://bindiving.com/\n' +
      'page: https://bindiving.com/results/*\n\n' +
      '# Prebaked \"best\" pages (kept in sync by scripts/prebake.mts)\n'
  }

  let updated = content.trimEnd()
  for (const url of urls) {
    const line = `page: ${url}`
    if (!content.includes(line)) {
      updated += (updated.endsWith('\n') ? '' : '\n') + line + '\n'
    }
  }

  if (updated !== content.trimEnd()) {
    writeFileSync(LLM_PATH, updated + '\n', 'utf-8')
    console.log(`Updated llm.txt with ${urls.length} prebaked URL(s)`)
  } else {
    console.log('llm.txt already up to date for prebaked URLs')
  }
}

function ensureSitemapEntries(urls: string[]): void {
  let content = ''
  if (existsSync(SITEMAP_PATH)) {
    content = readFileSync(SITEMAP_PATH, 'utf-8')
  } else {
    content =
      '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n' +
      '<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\\n' +
      '  <url>\\n' +
      '    <loc>https://bindiving.com/</loc>\\n' +
      '  </url>\\n' +
      '</urlset>\\n'
  }

  // Insert new <url> entries before closing </urlset>
  const insertIndex = content.lastIndexOf('</urlset>')
  if (insertIndex === -1) {
    console.warn('sitemap.xml missing </urlset>, skipping update')
    return
  }

  const before = content.slice(0, insertIndex)
  const after = content.slice(insertIndex)

  let middle = ''
  for (const url of urls) {
    const locLine = `<loc>${url}</loc>`
    if (content.includes(locLine)) continue
    middle +=
      '  <url>\\n' +
      `    <loc>${url}</loc>\\n` +
      '  </url>\\n'
  }

  if (!middle) {
    console.log('sitemap.xml already up to date for prebaked URLs')
    return
  }

  const updated = before + middle + after
  writeFileSync(SITEMAP_PATH, updated, 'utf-8')
  console.log(`Updated sitemap.xml with ${urls.length} prebaked URL(s)`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const slugArg = args[0]
  const queryArg = args[1]
  const queries: QueryEntry[] = slugArg && queryArg ? [{ slug: slugArg.trim(), query: queryArg.trim() }] : loadQueries()

  console.log(`Prebaking ${queries.length} queries → ${OUT_DIR}`)
  for (let i = 0; i < queries.length; i++) {
    await runOne(queries[i])
    if (i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  if (prebakedUrls.length > 0) {
    ensureLlmEntries(prebakedUrls)
    ensureSitemapEntries(prebakedUrls)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
