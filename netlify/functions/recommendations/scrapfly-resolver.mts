import { ScrapflyClient, ScrapeConfig } from 'scrapfly-sdk'

const SCRAPFLY_API_KEY = process.env.SCRAPFLY_API_KEY

const scrapClient = new ScrapflyClient({ key: SCRAPFLY_API_KEY })

export async function resolveAmazonLink(product) {
  console.log(`searching scapfly for ${product.product_name}`)
  const response = await scrapClient.scrape(
    new ScrapeConfig({
      url: `https://www.google.com/search?q=${encodeURI('amazon'.concat(' ', product.product_name))}`,
      country: 'us',
      asp: true,
      proxy_pool: 'public_residential_pool'
    })
  )

  console.log(`parsing scrapfly for ${product.product_name}`)
  const matches = response.result.content.match(/https:\/\/www.amazon.com\/[^\/]*\/dp\/[A-Z0-9]{10}/g)

  return Object.assign(product, {
    amazon_url: matches[0]
  })
}
