const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || ''

type PerplexityProduct = {
  amazon_url?: string
  articles?: string[]
  valid: boolean
}

export async function queryPerplexity(product): Promise<PerplexityProduct> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      Accept: 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content:
            'Respond as a JSON object with the following format: { amazon_url, articles[] }. Please only respond with the JSON object and nothing else.'
        },
        {
          role: 'user',
          content: `
Find me the current valid Amazon link for the following product, along with two or three links to articles that recommend the product. Articles should be independt reviews or recommendations, not product pages or sales pages. The product is:
${product.product_name}
          `
        }
      ]
    })
  })

  const jsonResponse = await response.json()

  if (!jsonResponse.choices || !jsonResponse.choices[0]) {
    console.error('No choices found in response', jsonResponse)
    return { valid: false }
  }

  const content = jsonResponse.choices[0].message.content.substring(
    jsonResponse.choices[0].message.content.indexOf('{'),
    jsonResponse.choices[0].message.content.lastIndexOf('}') + 1
  )

  try {
    const parsedContent = JSON.parse(content)
    return {
      valid: true,
      amazon_url: parsedContent.amazon_url,
      articles: parsedContent.articles.map((article) => article.link).filter((link) => link)
    }
  } catch (error) {
    console.error('Error parsing JSON', content)
  }

  return { valid: false }
}
