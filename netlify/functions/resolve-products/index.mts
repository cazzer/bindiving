import { Config, Context } from '@netlify/functions'
import { resolveRecommendations } from '../recommendations/resolve-recommendations.mjs'

export default async function resolveProducts(req: Request, context: Context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: { recommendations?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid JSON' }), { status: 400 })
  }

  const recommendations = body?.recommendations
  if (!Array.isArray(recommendations)) {
    return new Response(JSON.stringify({ valid: false, message: 'recommendations array required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const result = await resolveRecommendations(recommendations)
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Resolve error:', error)
    return new Response(
      JSON.stringify({ valid: false, message: 'Failed to resolve products. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config: Config = {
  path: '/api/resolve-products'
}
