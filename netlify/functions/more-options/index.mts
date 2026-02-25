import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'

import { processCaptcha } from '../recommendations/recatpcha.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

const MORE_INPUT =
  'Give me 3 more product recommendations in the same JSON format (product_name, pros, cons, price, amazon_id, sources). Return only the JSON array, no other text.'

export default async function moreOptions(req: Request, context: Context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: { previous_response_id?: string; recaptcha?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid JSON' }), { status: 400 })
  }

  const previousResponseId = body?.previous_response_id?.trim()
  if (!previousResponseId) {
    return new Response(JSON.stringify({ valid: false, message: 'previous_response_id required' }), { status: 400 })
  }

  const captchaResponse = await processCaptcha(body?.recaptcha)
  if (captchaResponse.success !== true) {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid reCaptcha' }), { status: 400 })
  }

  try {
    const response = await openai.responses.create({
      previous_response_id: previousResponseId,
      input: MORE_INPUT,
      model: 'gpt-4o',
      tools: [{ type: 'web_search' }],
      background: true
    })

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        response: { id: response.id }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('OpenAI API error:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'Failed to get more options. Please try again.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config: Config = {
  path: '/api/more-options'
}
