import { Config, Context } from '@netlify/functions'
import * as cheerio from 'cheerio'
import UserAgent from 'user-agents'

function getMeta($: ReturnType<typeof cheerio.load>, baseUrl: string) {
  const get = (og: string, twitter: string) => {
    const ogVal = $(`meta[property="${og}"]`).attr('content')
    const twVal = $(`meta[name="${twitter}"]`).attr('content')
    return (ogVal || twVal || '').trim()
  }
  const title = get('og:title', 'twitter:title') || $('title').text().trim()
  const description = get('og:description', 'twitter:description')
  let image = get('og:image', 'twitter:image')
  const url = get('og:url', 'twitter:url') || baseUrl
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, baseUrl).href
    } catch {
      image = ''
    }
  }
  return { title, description, image, url }
}

export default async function linkPreviewHandler(req: Request, context: Context) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }
  const url = new URL(req.url)
  const target = url.searchParams.get('url')
  if (!target || !target.startsWith('http://') && !target.startsWith('https://')) {
    return new Response(JSON.stringify({ error: 'Valid url query required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const ua = new UserAgent()
    const res = await fetch(target, {
      headers: { 'User-Agent': ua.toString() },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Fetch failed: ${res.status}` }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }
    const html = await res.text()
    const $ = cheerio.load(html)
    const finalUrl = res.url || target
    const meta = getMeta($, finalUrl)
    return new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Link preview error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to fetch URL' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config: Config = {
  path: '/api/link-preview'
}
