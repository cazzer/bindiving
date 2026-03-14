/**
 * Stream from OpenAI Responses API by creating with stream: true (no background).
 * Handles both initial search (query + recaptcha) and more options (previous_response_id + recaptcha).
 * POST body: { query?, previous_response_id?, recaptcha }. Returns SSE stream.
 */
import { BASE_SYSTEM_PROMPT, MORE_OPTIONS_INPUT, getUserMessage } from '../shared/recommendation-prompt.ts'

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

  let body: { query?: string; previous_response_id?: string; recaptcha?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const query = body?.query?.trim()
  const previousResponseId = body?.previous_response_id?.trim()
  const recaptchaToken = body?.recaptcha
  const isMoreOptions = Boolean(previousResponseId)
  if (!recaptchaToken) {
    return new Response(JSON.stringify({ error: 'recaptcha required' }), { status: 400 })
  }
  if (!isMoreOptions && !query) {
    return new Response(JSON.stringify({ error: 'query required for initial search' }), { status: 400 })
  }

  const verifyRes = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${encodeURIComponent(recaptchaToken)}`,
    { method: 'POST' }
  )
  const verify = await verifyRes.json()
  if (!verify?.success) {
    return new Response(JSON.stringify({ error: 'Invalid reCAPTCHA' }), { status: 400 })
  }

  const openaiBody = isMoreOptions
    ? {
        stream: true,
        model: 'gpt-4o',
        tools: [{ type: 'web_search' }],
        previous_response_id: previousResponseId,
        input: MORE_OPTIONS_INPUT
      }
    : {
        stream: true,
        model: 'gpt-5-mini',
        reasoning: { effort: 'low' },
        tools: [{ type: 'web_search' }],
        input: [
          { role: 'system', content: BASE_SYSTEM_PROMPT },
          { role: 'user', content: getUserMessage(query!) }
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
