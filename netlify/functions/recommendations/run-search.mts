/**
 * Run recommendation search (non-streaming): create response, poll until completed, return output_text.
 * Shared by: prebake script. Edge uses stream-search for live traffic.
 */
import OpenAI from 'openai'
import { BASE_SYSTEM_PROMPT, getUserMessage } from './recommendation-prompt.mts'

const OPENAI_ORG = 'org-t125kCvFULIVCLilC1zVFW3r'
const OPENAI_PROJECT = 'proj_TSZaJWtjqeTKTkVwHfRKP36z'
const POLL_INTERVAL_MS = 2000
const POLL_MAX_WAIT_MS = 120_000

export type RunSearchResult = { outputText: string; responseId: string }

export async function runSearch(
  query: string,
  options?: { apiKey?: string }
): Promise<RunSearchResult> {
  const apiKey = options?.apiKey ?? process.env.OPEN_AI_KEY
  if (!apiKey) throw new Error('OPEN_AI_KEY required for runSearch')

  const openai = new OpenAI({
    organization: OPENAI_ORG,
    project: OPENAI_PROJECT,
    apiKey
  })

  const response = await openai.responses.create({
    stream: false,
    model: 'gpt-5-mini',
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' }],
    input: [
      { role: 'system', content: BASE_SYSTEM_PROMPT },
      { role: 'user', content: getUserMessage(query.trim()) }
    ]
  })

  const id = (response as { id?: string }).id
  if (!id) throw new Error('OpenAI response missing id')

  let current = response as { status?: string; output_text?: string }
  const deadline = Date.now() + POLL_MAX_WAIT_MS

  while (current.status !== 'completed') {
    if (current.status === 'failed' || current.status === 'cancelled') {
      throw new Error(`OpenAI response ${current.status}`)
    }
    if (Date.now() > deadline) throw new Error('runSearch timed out waiting for completion')
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    current = await openai.responses.retrieve(id, {
      include: ['web_search_call.action.sources'] as never[]
    }) as { status?: string; output_text?: string }
  }

  const outputText = current.output_text ?? ''
  return { outputText, responseId: id }
}
