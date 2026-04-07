/**
 * Evaluate a single Amazon product and optionally recommend alternatives.
 * Streams from OpenAI Responses API. Used by the Chrome extension.
 * POST body: { product_name, price?, category?, asin? }
 * Returns SSE stream.
 */
import { EVALUATE_PRODUCT_PROMPT, getEvaluateMessage } from '../shared/recommendation-prompt.ts'

const ALLOWED_ORIGINS = [
  'https://bindiving.com',
  'https://www.bindiving.com',
]

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  // Allow Chrome extension origins and the site itself
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('http://localhost')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

const evaluateProduct = async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(request),
    })
  }

  const netlify = (globalThis as { Netlify?: { env: { get: (k: string) => string | undefined } } }).Netlify
  const apiKey = netlify?.env?.get?.('OPEN_AI_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: corsHeaders(request),
    })
  }

  let body: { product_name?: string; price?: string; category?: string; asin?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: corsHeaders(request),
    })
  }

  const productName = body?.product_name?.trim()
  if (!productName) {
    return new Response(JSON.stringify({ error: 'product_name required' }), {
      status: 400,
      headers: corsHeaders(request),
    })
  }

  const openaiBody = {
    stream: true,
    model: 'gpt-5-mini',
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: EVALUATE_PRODUCT_PROMPT },
      {
        role: 'user',
        content: getEvaluateMessage({
          product_name: productName,
          price: body.price,
          category: body.category,
          asin: body.asin,
        }),
      },
    ],
  }

  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(openaiBody),
  })

  if (!openaiRes.ok) {
    const text = await openaiRes.text()
    console.error('OpenAI evaluate-product failed:', openaiRes.status, text)
    return new Response(JSON.stringify({ error: 'Evaluation failed. Please try again.' }), {
      status: 502,
      headers: corsHeaders(request),
    })
  }

  return new Response(openaiRes.body, {
    headers: {
      ...corsHeaders(request),
      'Content-Type': openaiRes.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export default evaluateProduct

export const config = {
  path: '/api/evaluate-product',
  method: ['POST', 'OPTIONS'],
  rateLimit: {
    windowSize: 60,
    windowLimit: 10,
    aggregateBy: ['ip'],
  },
}
