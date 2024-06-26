const BRAVE_API_KEY = process.env.BRAVE_API_KEY

export async function resolveAmazonLink(product) {
  console.log(`searching brave for ${product.product_name}`)
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURI(`amazon ${product.product_name}`)}`,
    {
      headers: new Headers({
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      })
    }
  )

  const result = await response.json()

  const match = result.web.results.find((result) =>
    result.url.match(/https:\/\/www.amazon.com\/[^\/]*\/dp\/[A-Z0-9]{10}/)
  )

  const amazon_id = match.url.match(/dp\/([A-Z0-9]{10})/)

  return Object.assign(product, {
    amazon_url: match.url,
    amazon_id: amazon_id.length > 1 ? amazon_id[1] : null,
    image_url: match.profile.img
  })
}
