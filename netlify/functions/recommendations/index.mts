import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'

const CAPTCHA_SECRET_KEY = process.env.SITE_RECAPTCHA_SECRET
const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const query = url.searchParams.get('query')

  if (!query) {
    return new Response(JSON.stringify({ valid: false, message: 'No query' }))
  }

  const captchaResponse = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_SECRET_KEY}&response=${url.searchParams.get(
      'recaptcha'
    )}`,
    {
      method: 'POST'
    }
  )

  const rawResponse = await new Response(captchaResponse.body).text()
  const response = JSON.parse(rawResponse)

  if (response.success !== true) {
    console.log('Recatpcha failed')
    return new Response(JSON.stringify({ valid: false, message: 'Invalid reCaptcha' }))
  }

  const rawRecommendations = await queryOpenAI(query)
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

export async function queryOpenAI(query) {
  const response = await openai.chat.completions.create({
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `
Respond with a JSON aray of products, each containing only the following fields: product_name, pros, cons, link, price, amazon_id.

What are three good options for ${query} that people recommend?
      `
      }
    ],
    model: 'gpt-4o'
  })

  return response.choices[0].message.content
}

export const config: Config = {
  path: '/api/recommendations'
}
