import { Config, Context } from '@netlify/functions'
import { queryOpenAI } from './openai.mjs'
import { processCaptcha } from './recatpcha.mjs'
import { resolveAmazonLink } from './brave-resolver.mjs'

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

    const resolvedProducts = await Promise.all(recommendations.products.map(resolveAmazonLink))

    console.log(resolvedProducts)

    return new Response(
      JSON.stringify({
        valid: true,
        recommendations: resolvedProducts
      })
    )
  } catch (error) {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid response from OpenAI' }))
  }
}

export const config: Config = {
  path: '/api/recommendations'
}
