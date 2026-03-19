import { Config, Context } from '@netlify/functions'
import { getLinkPreview } from '../recommendations/get-link-preview.mjs'

type LinkPreviewState = 'ready' | 'partial' | 'no_preview' | 'unreachable' | 'invalid_url' | 'invalid_method'

type LinkPreviewResponse = {
  ok: boolean
  state: LinkPreviewState
  data: {
    title: string
    description: string
    image: string
    url: string
  }
  error: null | {
    code: string
    message: string
  }
}

function emptyData(url = '') {
  return { title: '', description: '', image: '', url }
}

export default async function linkPreviewHandler(req: Request, context: Context) {
  if (req.method !== 'GET') {
    const body: LinkPreviewResponse = {
      ok: false,
      state: 'invalid_method',
      data: emptyData(),
      error: { code: 'INVALID_METHOD', message: 'Method not allowed' }
    }
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  }
  const url = new URL(req.url)
  const target = url.searchParams.get('url')
  if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
    const body: LinkPreviewResponse = {
      ok: false,
      state: 'invalid_url',
      data: emptyData(target || ''),
      error: { code: 'INVALID_URL', message: 'Valid url query required' }
    }
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const meta = await getLinkPreview(target)
    const hasTitle = Boolean(meta.title?.trim())
    const hasDescription = Boolean(meta.description?.trim())
    const hasImage = Boolean(meta.image?.trim())
    const hasAny = hasTitle || hasDescription || hasImage
    const state: LinkPreviewState = hasAny ? (hasTitle ? 'ready' : 'partial') : 'no_preview'
    const body: LinkPreviewResponse = {
      ok: hasAny,
      state,
      data: {
        title: meta.title || '',
        description: meta.description || '',
        image: meta.image || '',
        url: meta.url || target
      },
      error: hasAny ? null : { code: 'OG_NOT_FOUND', message: 'No Open Graph or Twitter metadata found' }
    }
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const statusMatch = err instanceof Error ? err.message.match(/Fetch failed:\s*(\d+)/) : null
    const statusCode = statusMatch ? Number(statusMatch[1]) : null

    // These are usually "expected" link-quality outcomes (missing, blocked, etc).
    if (statusCode === 403 || statusCode === 404) {
      console.info('Link preview fetch failed:', err instanceof Error ? err.message : String(err))
    } else {
      console.error('Link preview error:', err)
    }
    const body: LinkPreviewResponse = {
      ok: false,
      state: 'unreachable',
      data: emptyData(target),
      error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Failed to fetch URL' }
    }
    return new Response(
      JSON.stringify(body),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config: Config = {
  path: '/api/link-preview'
}
