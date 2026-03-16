import { Config, Context } from '@netlify/functions'
import { getLinkPreview } from '../recommendations/get-link-preview.mjs'

export default async function linkPreviewHandler(req: Request, context: Context) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } })
  }
  const url = new URL(req.url)
  const target = url.searchParams.get('url')
  if (!target || (!target.startsWith('http://') && !target.startsWith('https://'))) {
    return new Response(JSON.stringify({ error: 'Valid url query required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const meta = await getLinkPreview(target)
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
