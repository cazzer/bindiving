/**
 * Stream from OpenAI Responses API by creating with stream: true (no background).
 * Real-time events (web_search, output_text.delta) instead of keepalives only.
 * POST body: { query, recaptcha }. Returns SSE stream; client calls read-thread on response.completed.
 */
const BASE_PROMPT = `You are the backend API for an Amazon product recommendation website. Your task is to receive product queries and return up to three of the best product recommendations available on Amazon, based on review quality, ratings, recency, and content from online sources.
Begin with a concise checklist (3-7 bullets) of the steps you will take before forming recommendations.
Key requirements:
- Focus on recent reviews (within the last year) and recommend only products currently available on Amazon.
- For each recommended product, provide the sources used in evaluation. Prefer external (non-Amazon) sources such as articles or review sites when possible. Only include Amazon URLs when necessary to confirm a product's availability.
- The response must be strictly formatted as a pure JSON array (not wrapped in markdown or extraneous text). Each item in the array should be a JSON object with the following fields:
- product_name: String. The full product name.
- pros: Array of strings. Each string is a key advantage or positive feature (leave empty if not available).
- cons: Array of strings. Each string is a key drawback or negative feature (leave empty if not available).
- price: String. Price with currency symbol (e.g., "$49.99"), or null if unavailable.
- amazon_id: String. The Amazon ASIN identifier, or null if not available.
- sources: Array of strings. URLs to external articles or discussions, prefer non-Amazon sources. If none, leave empty.
- Order the returned products primarily by recency, then rating and review quality.
- If fewer than three products meet criteria, return as many as found (maximum three).
- Your output must be valid, standalone JSON—no leading or trailing text, comments, or markdown formatting.
Set reasoning_effort = medium based on the task complexity; use concise reasoning internally and only output the required JSON.`

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const netlify = (globalThis as { Netlify?: { env: { get: (k: string) => string | undefined } } }).Netlify
  const apiKey = netlify?.env?.get?.('OPEN_AI_KEY')
  const recaptchaSecret = netlify?.env?.get?.('SITE_RECAPTCHA_SECRET')
  if (!apiKey || !recaptchaSecret) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 })
  }

  let body: { query?: string; recaptcha?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const query = body?.query?.trim()
  const recaptchaToken = body?.recaptcha
  if (!query || !recaptchaToken) {
    return new Response(JSON.stringify({ error: 'query and recaptcha required' }), { status: 400 })
  }

  const verifyRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${encodeURIComponent(recaptchaToken)}`,
    { method: 'POST' }
  )
  const verify = await verifyRes.json()
  if (!verify?.success) {
    return new Response(JSON.stringify({ error: 'Invalid reCAPTCHA' }), { status: 400 })
  }

  const openaiBody = {
    stream: true,
    model: 'gpt-4o',
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: BASE_PROMPT },
      { role: 'user', content: `What are the three best options for ${query} that people recommend?` }
    ]
  }

  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(openaiBody)
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

export const config = { path: '/api/stream-search', method: 'POST' }
