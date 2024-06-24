import { Config, Context } from '@netlify/functions'

const CAPTCHA_SECRET_KEY = { process.env }

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)
  console.log(url.searchParams.get('query'))
  return new Response(JSON.stringify({ valid: true }))
}

export const config: Config = {
  path: '/api/recommendations'
}
