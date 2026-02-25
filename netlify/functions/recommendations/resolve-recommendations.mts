import Bottleneck from 'bottleneck'
import { resolveAmazonLink as resolveBraveProduct } from './brave-resolver.mjs'
import resolveAmazonProduct from './amazon-resolver.mjs'

const limiter = new Bottleneck({ maxConcurrent: 2, minTime: 1000 })

export type OpenAiProduct = {
  product_name: string
  amazon_id: string
  pros: string[]
  cons: string[]
  sources: string[]
  price: string
}

export type ResolveResult =
  | { valid: true; recommendations: Array<OpenAiProduct & { valid: true }> }
  | { valid: false; message: string }

async function resolveProduct(
  product: OpenAiProduct,
  resolver: (p: OpenAiProduct) => Promise<unknown> = resolveAmazonProduct,
  attempt = 1
): Promise<OpenAiProduct & { valid: boolean }> {
  try {
    const amazonProduct = await limiter.schedule(() => resolver(product))
    return Object.assign(product, {
      valid: true,
      ...amazonProduct,
      sources: product.sources
    }) as OpenAiProduct & { valid: true }
  } catch (error) {
    if (attempt === 1) {
      return resolveProduct(product, resolveBraveProduct as (p: OpenAiProduct) => Promise<unknown>, 2)
    }
  }
  return { ...product, valid: false }
}

export async function resolveRecommendations(recommendations: OpenAiProduct[]): Promise<ResolveResult> {
  const resolved = await Promise.all(recommendations.map((rec) => resolveProduct(rec, resolveAmazonProduct)))
  const validProducts = resolved.filter((p): p is OpenAiProduct & { valid: true } => p.valid === true)
  if (validProducts.length === 0) {
    return {
      valid: false,
      message:
        "Couldn't resolve any products...probably because too many people are bin diving right now. Try again later. Or don't, I don't care."
    }
  }
  return { valid: true, recommendations: validProducts }
}

export type ResolveOneResult = { valid: true; product: OpenAiProduct & { valid: true } } | { valid: false; message?: string }

export async function resolveOne(recommendation: OpenAiProduct): Promise<ResolveOneResult> {
  const result = await resolveProduct(recommendation, resolveAmazonProduct)
  if (result.valid) {
    return { valid: true, product: result }
  }
  return { valid: false, message: "Couldn't resolve this product." }
}
