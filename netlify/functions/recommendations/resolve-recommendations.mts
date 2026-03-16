import Bottleneck from 'bottleneck'
import { resolveAmazonLink as resolveBraveProduct } from './brave-resolver.mjs'
import resolveViaCheerio from './cheerio-resolver.mjs'
import resolveAmazonProduct from './amazon-resolver.mjs'

const limiter = new Bottleneck({ maxConcurrent: 2, minTime: 1000 })
const RESOLVER_TIMEOUT_MS = 6000

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

type ResolverFn = (p: OpenAiProduct) => Promise<Record<string, unknown>>

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

function hasUsableAmazonLink(result: unknown): boolean {
  return Boolean(
    result &&
    typeof result === 'object' &&
    'amazon_url' in result &&
    typeof (result as { amazon_url?: unknown }).amazon_url === 'string' &&
    (result as { amazon_url: string }).amazon_url.length > 0
  )
}

async function resolveProduct(product: OpenAiProduct): Promise<OpenAiProduct & { valid: boolean }> {
  const resolvers: Array<{ name: 'amazon' | 'brave' | 'cheerio'; fn: ResolverFn; disabled?: boolean }> = [
    { name: 'amazon', fn: resolveAmazonProduct as ResolverFn, disabled: true },
    { name: 'brave', fn: resolveBraveProduct as ResolverFn },
    { name: 'cheerio', fn: resolveViaCheerio as ResolverFn }
  ]

  for (const resolver of resolvers) {
    if (resolver.disabled) {
      continue
    }
    try {
      const resolved = await limiter.schedule(() =>
        withTimeout(resolver.fn(product), RESOLVER_TIMEOUT_MS, resolver.name)
      )
      if (!hasUsableAmazonLink(resolved)) {
        throw new Error(`${resolver.name} returned no usable amazon_url`)
      }

      return Object.assign(product, {
        valid: true,
        ...resolved,
        sources: product.sources
      }) as OpenAiProduct & { valid: true }
    } catch (error) {
      console.warn(`[resolver:${resolver.name}] failed for "${product.product_name}"`, error)
    }
  }

  return { ...product, valid: false }
}

export async function resolveRecommendations(recommendations: OpenAiProduct[]): Promise<ResolveResult> {
  const resolved = await Promise.all(recommendations.map((rec) => resolveProduct(rec)))
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

export type ResolveOneResult =
  | { valid: true; product: OpenAiProduct & { valid: true } }
  | { valid: false; message?: string }

export async function resolveOne(recommendation: OpenAiProduct): Promise<ResolveOneResult> {
  const result = await resolveProduct(recommendation)
  if (result.valid) {
    return { valid: true, product: result }
  }
  return { valid: false, message: "Couldn't resolve this product." }
}
