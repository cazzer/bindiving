import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'

import { processCaptcha } from '../recommendations/recatpcha.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY
const ASSISTANT_ID = 'asst_bxlOOqt9hOZjDiCRI9ChVok1'

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

  const thread = await openai.beta.threads.create()
  const message = await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: query
  })
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: ASSISTANT_ID
  })

  return new Response(
    JSON.stringify({
      success: true,
      threadId: thread.id,
      runId: run.id,
      message: message.id
    })
  )
}

export const config: Config = {
  path: '/api/assistant'
}
