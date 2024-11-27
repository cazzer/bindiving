import * as cheerio from 'cheerio'

export default async function resolveViaCheerio(product) {
  const url = `https://www.amazon.com/s?k=${encodeURI(product.product_name)}`
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  })
  const html = await response.text()
  const $ = cheerio.load(html)

  const result = $('.s-result-item:not(.AdHolder)').get()[1]
  const imageSet = $(result).find('img').first().attr('srcset').split(', ')
  const image = imageSet[imageSet.length - 1].split(' ')[0]
  const titles = $(result).find(`[data-cy="title-recipe"] h2`)
  const prices = $(result).find(`[data-cy="price-recipe"]`)

  const blackFridayDeal = $(prices).find('.a-badge-text').text() === 'Black Friday Deal'

  return Object.assign(product, {
    image_url: image,
    images: [image],
    amazon_url: $(result).find('a').attr('href'),
    price: $(prices).find('.a-price .a-offscreen').first().text(),
    amazon_id: $(result).attr('data-asin'),
    brand: $(titles).first().text(),
    blackFriday: blackFridayDeal,
    gpt_azn: product.amazon_id,
    resolver: 'cheerio'
  })
}
