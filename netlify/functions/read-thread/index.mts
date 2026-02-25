import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'
import { resolveRecommendations } from '../recommendations/resolve-recommendations.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export default async function readThread(req: Request, context: Context) {
  const url = new URL(req.url)
  const responseId = url.searchParams.get('response-id')
  const raw = url.searchParams.get('raw') === '1'

  if (!responseId) {
    return new Response(JSON.stringify({ valid: false, message: 'Response ID must be provided' }))
  }

  const response = await openai.responses.retrieve(responseId, {
    // API supports this; SDK ResponseIncludable type omits it
    include: ['web_search_call.action.sources'] as never[]
  })

  if (response.status !== 'completed') {
    return new Response(JSON.stringify({ status: 'pending' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (response && response.output_text) {
    try {
      const parsed = JSON.parse(response.output_text)
      const recommendations = Array.isArray(parsed) ? parsed : [parsed]
      if (raw) {
        return new Response(
          JSON.stringify({ valid: true, recommendations }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
      const result = await resolveRecommendations(recommendations)
      if (!result.valid) {
        return new Response(JSON.stringify(result))
      }
      return new Response(JSON.stringify(result))
    } catch (error) {
      console.error(`ERROR: ${error.message}`)
      console.error(response.output_text)
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Failed to parse recommendations, please try again later in hopes I've fixed this issue."
        })
      )
    }
  } else {
    return new Response(
      JSON.stringify({
        valid: false,
        message:
          'No recommendations returned. Try using different search terms without being too specific, (e.g. "bamboo bathmat", and not "bamboo bathmat with .5 inch beveled edges").'
      })
    )
  }
}

export const config: Config = {
  path: '/api/read-thread'
}
