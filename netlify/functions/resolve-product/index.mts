import { Config, Context } from '@netlify/functions'
import { resolveOne } from '../recommendations/resolve-recommendations.mjs'

export default async function resolveProductHandler(req: Request, context: Context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let body: { recommendation?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ valid: false, message: 'Invalid JSON' }), { status: 400 })
  }

  const recommendation = body?.recommendation
  if (!recommendation || typeof recommendation !== 'object' || !('product_name' in recommendation)) {
    return new Response(JSON.stringify({ valid: false, message: 'recommendation object with product_name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const result = await resolveOne(recommendation as Parameters<typeof resolveOne>[0])
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Resolve product error:', error)
    return new Response(
      JSON.stringify({ valid: false, message: 'Failed to resolve product.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const config: Config = {
  path: '/api/resolve-product'
}
