import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'
import { resolveAmazonLink } from '../recommendations/brave-resolver.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export default async function assistant(req: Request, context: Context) {
  const url = new URL(req.url)
  const threadId = url.searchParams.get('thread-id')
  const runId = url.searchParams.get('run-id')

  if (!threadId || !runId) {
    return new Response(JSON.stringify({ valid: false, message: 'Thread and Run ID must be provided' }))
  }

  let complete = false

  while (!complete) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId)
    if (run.status === 'completed') {
      complete = true
    }
  }

  const threadMessages = await openai.beta.threads.messages.list(threadId)
  const response = threadMessages.data.find((message) => message.run_id === runId)

  if (response && response.content) {
    complete = true
    const contentType = response.content[0]?.type
    const rawRecommendations = response.content[0][contentType].value

    try {
      const recommendations = JSON.parse(rawRecommendations)
      const resolvedProducts = await Promise.all(recommendations.map(resolveAmazonLink))

      return new Response(
        JSON.stringify({
          valid: true,
          recommendations: resolvedProducts
        })
      )
    } catch (error) {
      console.error(rawRecommendations)
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Failed to parse recommendations'
        })
      )
    }
  } else {
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'No recommendations returned'
      })
    )
  }
}

export const config: Config = {
  path: '/api/read-thread'
}
