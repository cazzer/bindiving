/**
 * Fetch a URL and extract OG/twitter meta for link preview.
 * Shared by: link-preview API handler, prebake script.
 */
import * as cheerio from 'cheerio'
import UserAgent from 'user-agents'

export type LinkPreviewMeta = {
  title: string
  description: string
  image: string
  url: string
}

function getMeta($: ReturnType<typeof cheerio.load>, baseUrl: string): LinkPreviewMeta {
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

export async function getLinkPreview(targetUrl: string): Promise<LinkPreviewMeta> {
  if (!targetUrl?.startsWith('http://') && !targetUrl?.startsWith('https://')) {
    throw new Error('Valid url required')
  }
  const ua = new UserAgent()
  const res = await fetch(targetUrl, {
    headers: { 'User-Agent': ua.toString() },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000)
  })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const finalUrl = res.url || targetUrl
  return getMeta($, finalUrl)
}
