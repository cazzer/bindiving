import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'

import { processCaptcha } from '../recommendations/recatpcha.mjs'
import { BASE_SYSTEM_PROMPT, getUserMessage } from '../recommendations/recommendation-prompt.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export default async function assistant(req: Request, context: Context) {
  const url = new URL(req.url)
  const query = url.searchParams.get('query')

  if (!query) {
    return new Response(JSON.stringify({ valid: false, message: 'No query provided' }))
  }

  // CAPTCHA
  const captchaResponse = await processCaptcha(url.searchParams.get('recaptcha'))
  if (captchaResponse.success !== true) {
    console.log('Recatpcha failed')
    return new Response(JSON.stringify({ valid: false, message: 'Invalid reCaptcha' }))
  }

  try {
    // Use chat completions with imported base prompt
    const response = await openai.responses.create({
      background: true,
      input: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'user', content: getUserMessage(query) }
      ],
      model: 'gpt-4o',
      tools: [{ type: 'web_search' }]
    })

    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        response
      })
    )
  } catch (error) {
    console.error('OpenAI API error:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'Failed to generate recommendations. Please try again.'
      })
    )
  }
}

export const config: Config = {
  path: '/api/assistant'
}
