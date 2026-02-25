import { describe, it, expect } from 'vitest'
import {
  stripJsonCodeFence,
  parsePartialRecommendations,
  parseFinalRecommendations,
  streamEventToMessage
} from './stream-recommendations'

describe('stripJsonCodeFence', () => {
  it('strips ```json ... ``` and returns inner content', () => {
    expect(stripJsonCodeFence('```json\n[]\n```')).toBe('[]')
    expect(stripJsonCodeFence('```json\n[{}]\n```')).toBe('[{}]')
  })
  it('strips ``` ... ``` without language tag', () => {
    expect(stripJsonCodeFence('```\n[]\n```')).toBe('[]')
  })
  it('returns trimmed string unchanged when no fence', () => {
    expect(stripJsonCodeFence('  [{"a":1}]  ')).toBe('[{"a":1}]')
    expect(stripJsonCodeFence('I am unable to assist')).toBe('I am unable to assist')
  })
  it('handles empty or non-string', () => {
    expect(stripJsonCodeFence('')).toBe('')
    expect(stripJsonCodeFence(null)).toBe(null)
  })
})

describe('parsePartialRecommendations', () => {
  it('returns valid items with product_name', () => {
    const buf = '[{"product_name":"Socks","pros":[]}]'
    expect(parsePartialRecommendations(buf)).toHaveLength(1)
    expect(parsePartialRecommendations(buf)[0].product_name).toBe('Socks')
  })
  it('filters out items without product_name', () => {
    expect(parsePartialRecommendations('[{}]')).toEqual([])
    expect(parsePartialRecommendations('[{"pros":[]}]')).toEqual([])
  })
  it('returns [] for non-array or non-JSON', () => {
    expect(parsePartialRecommendations('')).toEqual([])
    expect(parsePartialRecommendations('not json')).toEqual([])
    expect(parsePartialRecommendations('{"key":"value"}')).toEqual([])
    expect(parsePartialRecommendations('I am unable to assist')).toEqual([])
  })
  it('handles incomplete array (closing with ])', () => {
    const buf = '[{"product_name":"A"}'
    expect(parsePartialRecommendations(buf + ']')).toHaveLength(1)
  })
})

describe('parseFinalRecommendations', () => {
  it('returns list and parseSucceeded for valid JSON array', () => {
    const out = '[{"product_name":"A"}]'
    const r = parseFinalRecommendations(out)
    expect(r.parseSucceeded).toBe(true)
    expect(r.list).toHaveLength(1)
    expect(r.list[0].product_name).toBe('A')
  })
  it('strips code fence then parses', () => {
    const out = '```json\n[]\n```'
    const r = parseFinalRecommendations(out)
    expect(r.parseSucceeded).toBe(true)
    expect(r.list).toEqual([])
  })
  it('returns parseSucceeded true and empty list for []', () => {
    const r = parseFinalRecommendations('[]')
    expect(r.parseSucceeded).toBe(true)
    expect(r.list).toEqual([])
  })
  it('accepts { recommendations: [...] } shape', () => {
    const out = '{"recommendations":[{"product_name":"B"}]}'
    const r = parseFinalRecommendations(out)
    expect(r.parseSucceeded).toBe(true)
    expect(r.list).toHaveLength(1)
    expect(r.list[0].product_name).toBe('B')
  })
  it('returns parseSucceeded false for prose', () => {
    const r = parseFinalRecommendations('I am unable to assist with that request.')
    expect(r.parseSucceeded).toBe(false)
    expect(r.list).toEqual([])
  })
  it('filters to valid items only', () => {
    const out = '[{"product_name":"A"},{},{"product_name":"B"}]'
    const r = parseFinalRecommendations(out)
    expect(r.list).toHaveLength(2)
    expect(r.list.map((x) => x.product_name)).toEqual(['A', 'B'])
  })
})

describe('streamEventToMessage', () => {
  it('returns null for invalid or missing type', () => {
    expect(streamEventToMessage(null)).toBe(null)
    expect(streamEventToMessage({})).toBe(null)
    expect(streamEventToMessage({ type: 123 })).toBe(null)
  })
  it('maps known event types to messages', () => {
    expect(streamEventToMessage({ type: 'keepalive' })).toBe('Waiting for response...')
    expect(streamEventToMessage({ type: 'response.completed' })).toBe('Complete')
    expect(
      streamEventToMessage({
        type: 'response.output_item.added',
        item: { type: 'web_search_call' }
      })
    ).toBe('Searching the web...')
  })
})
