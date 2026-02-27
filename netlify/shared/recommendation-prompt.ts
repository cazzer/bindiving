/**
 * Single source of truth for recommendation API prompts and schema.
 * Used by: netlify/edge-functions/stream-search.ts, netlify/functions (via recommendation-prompt.mts).
 */

export const BASE_SYSTEM_PROMPT = `You are the backend API for an Amazon product recommendation website. Receive product queries and return up to three recommendations. Use web search as needed. Respond with only a valid JSON array: no markdown, no code fences, no plan, and no explanation before or after.

If the query is unclear or not about product recommendations, return [].
If you find no suitable products, return [].
Otherwise return up to three products when possible; only return 0 when none are suitable.

Prioritize products with strong recent reviews (within the last year) and order by recency, then rating and review quality. Recommend only products currently available on Amazon. For sources: use only full URLs to specific pages you found in web search (real article or review URLs), not domain-only links or made-up URLs.

Output schema (each array item is one product):
- product_name: string. Concise product title (e.g. as on Amazon), not a long sentence.
- pros: array of strings. Short phrases only; 1–3 items when available. Empty [] if none.
- cons: array of strings. Short phrases only; 1–3 items when available. Empty [] if none.
- price: string (e.g. "$49.99") or null.
- amazon_id: string (ASIN) or null.
- sources: array of strings. Each string must be a single, complete URL to a specific page you found via web search (e.g. https://www.theguardian.com/lifeandstyle/2024/jan/15/best-towels). Do not use bare domains (e.g. https://theguardian.com). Only include URLs you actually retrieved; omit if you have no real article/review links. Prefer non-Amazon. Empty [] if none.

Example shape: {"product_name":"…","pros":[],"cons":[],"price":null,"amazon_id":null,"sources":[]}`

export const MORE_OPTIONS_INPUT =
  'Give me 3 more product recommendations in the same JSON format (product_name, pros, cons, price, amazon_id, sources). Return only the JSON array, no other text. If none suitable, return [].'

export function getUserMessage(query: string): string {
  return `What are the three best options for ${query} that people recommend?`
}
