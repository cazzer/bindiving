import * as cheerio from 'cheerio'
import UserAgent from 'user-agents'

function toAbsoluteAmazonUrl(url: string | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://www.amazon.com${url.startsWith('/') ? '' : '/'}${url}`
}

function extractImageUrl(resultEl: cheerio.Element, $: cheerio.CheerioAPI): string | undefined {
  const img = $(resultEl).find('img').first()
  const srcset = img.attr('srcset')
  if (srcset) {
    const entries = srcset
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    if (entries.length > 0) {
      const last = entries[entries.length - 1]
      const candidate = last.split(' ')[0]
      if (candidate) return candidate
    }
  }
  return img.attr('src')
}

export default async function resolveViaCheerio(product) {
  const userAgent = new UserAgent()
  const url = `https://www.amazon.com/s?k=${encodeURI(product.product_name)}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent.toString()
    }
  })
  const html = await response.text()
  const $ = cheerio.load(html)

  const candidates = $('.s-result-item:not(.AdHolder)').get()
  const result =
    candidates.find((el) => {
      const asin = $(el).attr('data-asin')
      const href = $(el).find('a').first().attr('href')
      return Boolean(asin && href)
    }) || candidates[0]

  if (!result) {
    throw new Error('No Amazon search results found')
  }

  const image = extractImageUrl(result, $)
  const titles = $(result).find(`[data-cy="title-recipe"] h2`)
  const prices = $(result).find(`[data-cy="price-recipe"]`)

  const blackFridayDeal = $(prices).find('.a-badge-text').text() === 'Black Friday Deal'
  const rawHref = $(result).find('a').first().attr('href')
  const amazonUrl = toAbsoluteAmazonUrl(rawHref)
  if (!amazonUrl) {
    throw new Error('Cheerio resolver did not find an amazon link')
  }

  const asinFromAttr = $(result).attr('data-asin')
  const asinMatch = amazonUrl.match(/\/dp\/([A-Z0-9]{10})/)
  const resolvedAsin = asinFromAttr || (asinMatch?.[1] ?? null)

  return Object.assign(product, {
    image_url: image,
    images: image ? [image] : [],
    amazon_url: amazonUrl,
    price: $(prices).find('.a-price .a-offscreen').first().text() || product.price,
    amazon_id: resolvedAsin,
    brand: $(titles).first().text(),
    blackFriday: blackFridayDeal,
    gpt_azn: product.amazon_id,
    resolver: 'cheerio'
  })
}
