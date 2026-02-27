import { afterEach, describe, expect, it, vi } from 'vitest'
import resolveViaCheerio from './cheerio-resolver.mjs'

const originalFetch = global.fetch

describe('resolveViaCheerio', () => {
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('extracts amazon link, asin, image and price from search html', async () => {
    const html = `
      <div class="s-result-item AdHolder" data-asin="IGNORE"></div>
      <div class="s-result-item" data-asin="B0ABC12345">
        <a href="/Acme-Widget/dp/B0ABC12345/ref=sr_1_1">Acme Widget</a>
        <img srcset="https://img.small.jpg 200w, https://img.large.jpg 1000w" />
        <div data-cy="title-recipe"><h2>Acme Widget Title</h2></div>
        <div data-cy="price-recipe"><span class="a-price"><span class="a-offscreen">$19.99</span></span></div>
      </div>
    `

    global.fetch = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(html)
    } as unknown as Response)

    const result = await resolveViaCheerio({ product_name: 'acme widget', price: '$29.00', amazon_id: 'OLDASIN' })

    expect(result.amazon_url).toBe('https://www.amazon.com/Acme-Widget/dp/B0ABC12345/ref=sr_1_1')
    expect(result.amazon_id).toBe('B0ABC12345')
    expect(result.image_url).toBe('https://img.large.jpg')
    expect(result.images).toEqual(['https://img.large.jpg'])
    expect(result.price).toBe('$19.99')
    expect(result.resolver).toBe('cheerio')
  })

  it('falls back to img src and original product price when optional fields are missing', async () => {
    const html = `
      <div class="s-result-item" data-asin="B0XYZ98765">
        <a href="/dp/B0XYZ98765">fallback item</a>
        <img src="https://fallback-image.jpg" />
      </div>
    `

    global.fetch = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(html)
    } as unknown as Response)

    const result = await resolveViaCheerio({ product_name: 'fallback item', price: '$44.00', amazon_id: 'OLDASIN' })

    expect(result.image_url).toBe('https://fallback-image.jpg')
    expect(result.price).toBe('$44.00')
    expect(result.amazon_url).toBe('https://www.amazon.com/dp/B0XYZ98765')
  })

  it('throws when no usable search result is present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue('<html><body><div>empty</div></body></html>')
    } as unknown as Response)

    await expect(resolveViaCheerio({ product_name: 'nothing here' })).rejects.toThrow('No Amazon search results found')
  })
})
