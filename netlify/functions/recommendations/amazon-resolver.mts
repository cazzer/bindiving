import amazonPaapi from 'amazon-paapi'
import { PartnerType } from 'amazon-paapi/SDK'

const { PA_API_ACCESS_KEY, PA_API_SECRET_KEY } = process.env

const commonParams = {
  AccessKey: PA_API_ACCESS_KEY,
  SecretKey: PA_API_SECRET_KEY,
  PartnerTag: 'bindiving-20',
  PartnerType: 'Associates',
  MarketPlace: 'www.amazon.com'
}

export default async function resolveAmazonProduct(product) {
  const results = await amazonPaapi.SearchItems(commonParams, {
    Keywords: product.product_name,
    SearchIndex: 'All',
    ItemCount: 1,
    Resources: [
      'Images.Primary.Medium',
      'Images.Primary.Large',
      'Images.Variants.Large',
      'ItemInfo.Title',
      'Offers.Listings.Price'
    ]
  })

  return Object.assign(product, {
    image_url: results.SearchResult.Items[0].Images.Primary.Large.URL,
    images: [
      results.SearchResult.Items[0].Images.Primary.Large.URL,
      ...results.SearchResult.Items[0].Images.Variants.map((image) => image.Large.URL)
    ],
    amazon_url: results.SearchResult.Items[0].DetailPageURL,
    gpt_azn: product.amazon_id,
    price: results.SearchResult.Items[0].Offers.Listings[0].Price.DisplayAmount,
    amazon_id: results.SearchResult.Items[0].ASIN
  })
}
