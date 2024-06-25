import { Config, Context } from '@netlify/functions'
import { queryOpenAI } from './openai.mjs'
import { processCaptcha } from './recatpcha.mjs'

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const query = url.searchParams.get('query')

  if (!query) {
    return new Response(JSON.stringify({ valid: false, message: 'No query provided' }))
  }

  const captchaResponse = await processCaptcha(url.searchParams.get('recaptcha'))
  if (captchaResponse.success !== true) {
    console.log('Recatpcha failed')
    return new Response(JSON.stringify({ valid: false, message: 'Invalid reCaptcha' }))
  }

  let rawRecommendations
  try {
    rawRecommendations = await queryOpenAI(query)
  } catch (error) {
    return new Response(
      JSON.stringify({
        valid: false,
        message: error.message
      })
    )
  }

  let recommendations
  try {
    recommendations = JSON.parse(rawRecommendations)
    console.log(recommendations.products)
    return new Response(
      JSON.stringify({
        valid: true,
        recommendations: recommendations.products
      })
    )
  } catch (error) {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid response from OpenAI' }))
  }
}

export const config: Config = {
  path: '/api/recommendations'
}
