import { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'
import Bottleneck from 'bottleneck'
import { resolveAmazonLink as resolveBraveProcuct } from '../recommendations/brave-resolver.mjs'
import resolveAmazonProduct from '../recommendations/amazon-resolver.mjs'
import { queryPerplexity } from '../recommendations/perplexity-resolver.mjs'
import resolveViaCheerio from '../recommendations/cheerio-resolver.mjs'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY
const limiter = new Bottleneck({ maxConcurrent: 2, minTime: 1000 })

type OpenAiProduct = {
  product_name: string
  amazon_id: string
  pros: string[]
  cons: string[]
  sources: string[]
  price: string
}

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export default async function readThread(req: Request, context: Context) {
  const url = new URL(req.url)
  const threadId = url.searchParams.get('thread-id')
  const runId = url.searchParams.get('run-id')

  if (!threadId || !runId) {
    return new Response(JSON.stringify({ valid: false, message: 'Thread and Run ID must be provided' }))
  }

  let complete = false
  const start = performance.now()

  while (!complete) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId)
    if (run.status === 'completed') {
      complete = true
    }
  }

  const end = performance.now()
  console.log(`Wasted ${end - start}ms waiting for the run to finish`)

  const threadMessages = await openai.beta.threads.messages.list(threadId)
  const response = threadMessages.data.find((message) => message.run_id === runId)

  if (response && response.content) {
    complete = true
    const contentType = response.content[0]?.type
    const rawRecommendations = response.content[0][contentType].value

    try {
      const recommendations = JSON.parse(rawRecommendations)
      const resolvedProducts = await Promise.all(recommendations.map(resolveProduct))

      console.log(resolvedProducts)
      const validProducts = resolvedProducts.filter((product) => product.valid)

      if (validProducts.length === 0) {
        JSON.stringify({
          valid: false,
          message:
            "Couldn't resolve any products...probably because too many people are bin diving right now. Try again later. Or don't, I don't care."
        })
      }

      return new Response(
        JSON.stringify({
          valid: true,
          recommendations: validProducts
        })
      )
    } catch (error) {
      console.error(`ERROR: ${error.message}`)
      console.error(rawRecommendations)
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

async function resolveProduct(product: OpenAiProduct) {
  try {
    console.log(`Resolving product: ${product.product_name}`)
    const amazonProduct = await limiter.schedule(() => resolveViaCheerio(product))
    const perplexityProduct = await queryPerplexity(product)

    return Object.assign(product, {
      valid: true,
      ...amazonProduct,
      sources: [...(perplexityProduct.valid ? perplexityProduct.articles : []), ...product.sources]
    })
  } catch (error) {
    console.error(`error resolving product
      product: ${product.product_name}
      error: ${error.message}`)
  }

  return {
    product_name: product.product_name,
    valid: false
  }
}
