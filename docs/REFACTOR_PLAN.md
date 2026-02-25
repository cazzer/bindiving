# Refactor plan: recommendations + stream parsing

Two focus areas: (1) consolidate recommendation endpoints and prompts, (2) extract and test stream parsing.

---

## 1. Recommendation endpoints & prompts

### Current state

| Path | Used by | Purpose |
|------|--------|--------|
| `POST /api/stream-search` (edge) | Page when `STREAM_ENABLED` | Streaming search + more-options |
| `GET /api/read-thread` | Page (streaming + polling) | Resolve response → recommendations |
| `POST /api/more-options` | Page (polling “more”) | Get 3 more, then poll read-thread |
| `POST /api/assistant` | Page when `!STREAM_ENABLED` | Initial search (background), then poll read-thread |
| `GET /api/recommendations` | **Nothing** | Legacy; different schema (`products`, `source_urls`) |

Prompts live in three places with minor drift:

- `netlify/edge-functions/stream-search.ts` — `BASE_PROMPT`, `MORE_INPUT`
- `netlify/functions/assistant/prompt.mts` — `basePrompt`
- `netlify/functions/recommendations/openai.mts` — inline prompt (different API: chat completions, `source_urls`)

### Plan

1. **Centralize prompt and schema**
   - Add a shared module used by all recommendation entrypoints, e.g. `netlify/functions/recommendations/prompt.mts` (or `shared/` if you prefer).
   - Export:
     - `BASE_SYSTEM_PROMPT` — single source of truth for system instructions and JSON schema (product_name, pros, cons, price, amazon_id, sources as URLs).
     - `MORE_OPTIONS_INPUT` — “Give me 3 more…” user message.
   - Have `stream-search.ts`, `assistant/prompt.mts`, and `more-options` import from this module so prompt/schema changes happen in one place.

2. **Treat streaming as primary, document polling**
   - In code or a short README section, state that the canonical search path is: **streaming** = `stream-search` → consume stream → `read-thread` for final list; **polling** = `assistant` → poll `read-thread` (and `more-options` for “more”).
   - No need to remove `assistant` or `more-options` if you want to keep `STREAM_ENABLED: false` as a fallback.

3. **Remove or clearly deprecate legacy `/api/recommendations`**
   - It’s unused and uses a different schema (`products`, `source_urls`) and chat completions.
   - Option A: Delete `netlify/functions/recommendations/index.mts` and `recommendations/openai.mts` (the legacy `queryOpenAI` path), and keep only the resolver/recaptcha/etc. under `recommendations/` that `read-thread` and resolve-product use.
   - Option B: If you might use it elsewhere, add a comment at the top of the handler: “Deprecated: use stream-search + read-thread or assistant + read-thread,” and leave it in place until you’re sure nothing calls it.

4. **Optional: shared recaptcha + “user message” helper**
   - If you want to avoid copy-paste, you could add a tiny helper that builds the user message (`What are the three best options for ${query}…`) in the shared prompt module so both stream-search and assistant use the same wording.

---

## 2. Stream parsing (extract + test)

### Current state

All streaming logic lives in `app/page.jsx`:

- `stripJsonCodeFence`, `parsePartialRecommendations`, `streamEventToMessage`
- `consumeStreamAndResolve`: read SSE, accumulate `outputText`, track `responseId`, update `currentRun` from partial parses, then final parse with fence stripping and “no valid items” handling

This is the most brittle part of the front end: any change to parsing or error handling can regress refusals, empty arrays, markdown-wrapped JSON, etc.

### Plan

1. **Extract a stream-parsing module**
   - Create e.g. `app/lib/stream-recommendations.js` (or `utils/` if you prefer).
   - Move into it (with no React or DOM deps):
     - `stripJsonCodeFence(s)`
     - `parsePartialRecommendations(buffer)` (and the “valid item” predicate: has `product_name`, etc.)
     - A small `parseFinalRecommendations(outputText)` that:
       - Runs `stripJsonCodeFence` then `JSON.parse`
       - Normalizes to array (direct array or `parsed.recommendations`)
       - Filters to items with `product_name`
       - Returns `{ list, parseSucceeded }` (or similar) so the UI can decide “No results” vs show API message.
   - Keep `streamEventToMessage` in the same module (or a sibling) so event → status string is in one place.
   - `page.jsx` then imports these helpers and keeps only the React/state side: `consumeStreamAndResolve` still lives in the page but calls the extracted parsers and `parseFinalRecommendations` for the final “no recommendations” branch.

2. **Add unit tests for the parsing helpers**
   - Put tests next to the module, e.g. `app/lib/stream-recommendations.test.js`, or in a top-level `__tests__` if you prefer.
   - Cover:
     - `stripJsonCodeFence`: `` "```json\n[]\n```" `` → `"[]"`; `` "```\n[{}]\n```" ``; no fence → unchanged.
     - `parsePartialRecommendations`: valid array; leading checklist then array; malformed/incomplete; empty array; array with no `product_name` (expect empty).
     - `parseFinalRecommendations`: same cases, plus `{ recommendations: [...] }` and “prose” text (parseSucceeded false or list empty).
   - Use Jest or Vitest (or whatever the project already uses). No need to test the full SSE loop; mocking `fetch`/stream is optional later.

3. **Document failure modes in the module**
   - At the top of `stream-recommendations.js`, add a short comment listing what the parser is defending against: model returns prose/refusal, empty `[]`, markdown code fence, partial JSON, array of non-objects or objects without `product_name`. That makes it easier to add tests when you hit new edge cases.

### Result

- `page.jsx` stays focused on state, UI, and calling the parsers.
- Parsing and normalization are reusable and testable; regressions are caught by tests.
- New edge cases (e.g. new fence format) get a test and a small code change in one place.

---

## Order of operations

- **Phase 1 (low risk):** Extract stream parsing to `app/lib/stream-recommendations.js`, add tests, then switch `page.jsx` to use it. No API or prompt changes.
- **Phase 2:** Add shared prompt module and point stream-search + assistant (+ more-options if it has its own prompt copy) at it.
- **Phase 3:** Remove or deprecate `/api/recommendations` and tidy `netlify/functions/recommendations/` so only the parts used by read-thread and resolve-product remain.

You can do Phase 1 and 2 in parallel if you prefer; Phase 3 is independent once you’ve confirmed nothing calls the legacy endpoint.
