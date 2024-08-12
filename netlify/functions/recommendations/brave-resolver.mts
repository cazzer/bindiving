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

  const productMatch = result.web.results.find((result) =>
    result.url.match(/https:\/\/www.amazon.com\/[^\/]*\/dp\/[A-Z0-9]{10}/)
  )

  const imageResponse = await fetch(
    `https://api.search.brave.com/res/v1/images/search?q=${encodeURI(product.product_name)}`,
    {
      headers: new Headers({
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      })
    }
  )

  const imageResult = await imageResponse.json()

  const imageMatch = imageResult.results[0]?.thumbnail?.src

  // const imageMatch = result.web.results.find(
  //   (result) => result.profile?.name !== 'Amazon' && result.thumbnail?.original
  // )?.thumbnail?.original

  const amazon_id = productMatch.url.match(/dp\/([A-Z0-9]{10})/)

  return Object.assign(product, {
    amazon_url: productMatch.url,
    amazon_id: amazon_id.length > 1 ? amazon_id[1] : null,
    gpt_azn: product.amazon_id,
    image_url: imageMatch
  })
}
