import OpenAI from 'openai'

const OPEN_AI_KEY = process.env.OPEN_AI_KEY

const openai = new OpenAI({
  organization: 'org-t125kCvFULIVCLilC1zVFW3r',
  project: 'proj_TSZaJWtjqeTKTkVwHfRKP36z',
  apiKey: OPEN_AI_KEY
})

export async function queryOpenAI(query) {
  const response = await openai.chat.completions.create({
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `
Respond with a JSON aray of products, each containing only the following fields: {product_name, pros[], cons[], amazon_id, source_urls[]}.

The source_urls field should contain valid links to websites which provide input for the recommendations.

What are the three best options for ${query} that people recommend?
      `
      }
    ],
    model: 'gpt-4o'
  })

  return response.choices[0].message.content
}
