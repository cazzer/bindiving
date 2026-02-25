/**
 * Edge function: stream OpenAI Responses API events to the client.
 * Used when search mode is "streaming" (toggle via ?stream=1 or localStorage bindiving_search_mode).
 * Keeps connection open until OpenAI stream ends, then client calls read-thread for final resolved list.
 */

export default async (request: Request) => {
  const url = new URL(request.url)
  const responseId = url.searchParams.get('response-id')
  if (!responseId) {
    return new Response(JSON.stringify({ error: 'response-id required' }), { status: 400 })
  }

  const apiKey = Netlify?.env?.get?.('OPEN_AI_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPEN_AI_KEY not configured' }), { status: 500 })
  }

  const openaiUrl = `https://api.openai.com/v1/responses/${responseId}?stream=true`
  const openaiRes = await fetch(openaiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  if (!openaiRes.ok) {
    const text = await openaiRes.text()
    return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: text }), {
      status: openaiRes.status
    })
  }

  return new Response(openaiRes.body, {
    headers: {
      'Content-Type': openaiRes.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}

export const config = { path: '/api/stream-response' }
