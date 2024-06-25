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
Respond with a JSON aray of products, each containing only the following fields: {product_name, pros[], cons[], price, amazon_id}.

Ensure that the Amazon ID is valid by checking the link.

What are three good options for ${query} that people recommend?
      `
      }
    ],
    model: 'gpt-4o'
  })

  return response.choices[0].message.content
}
