import resolveViaCheerio from './cheerio-resolver.mjs'

async function main() {
  const result = await resolveViaCheerio({ product_name: `Arc'teryx Remige Sleeveless Tank` })
  console.log(result)
}

main()
