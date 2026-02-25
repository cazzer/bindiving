# Search mode: Polling vs streaming

Two ways to get recommendations after the assistant creates a background response. A hidden toggle switches between them.

## Toggle

- **Query param:** `?stream=1` enables streaming for that load; `?stream=0` forces polling.
- **localStorage:** `bindiving_search_mode` = `"streaming"` or `"polling"`. Persists across sessions. Query param overrides for the current page.
- **Default:** polling (cheaper, no Edge dependency).
- **Where:** Read in the frontend before starting a search; no UI.

**How to switch (hidden):** In the browser console:
- `localStorage.setItem('bindiving_search_mode', 'streaming')` then reload or run a search to use Edge streaming.
- `localStorage.setItem('bindiving_search_mode', 'polling')` to use frontend polling.
- Or open the site with `?stream=1` or `?stream=0` in the URL for one-off override.

---

## Option 1: Frontend polling (default)

**Flow**

1. User searches → POST `/api/assistant` → returns `response.id`.
2. Frontend polls GET `/api/read-thread?response-id=<id>` every 3s.
3. read-thread does a **single** `responses.retrieve()` (no loop). If `status !== 'completed'` → return `{ status: 'pending' }`. If completed → parse, resolve products, return `{ valid, recommendations }`.
4. Frontend stops polling when `status !== 'pending'` and shows result or error.

**Backend**

- **read-thread** (Netlify serverless): Remove `while` loop. One `retrieve()`. On pending: `return new Response(JSON.stringify({ status: 'pending' }), { status: 202 })`. On completed: existing parse + resolve + return. Prefer GET for polling (optional; POST still works).

**Frontend**

- Remove the 60s `sleep`.
- After assistant returns id, start a polling loop (e.g. every 3s) to read-thread until `result.status !== 'pending'`.
- Keep existing Digging UI during wait.

**Cost:** Many short serverless invocations (one per poll). No long-held connections.

---

## Option 2: Deno Edge streaming

**Flow**

1. User searches → POST `/api/assistant` (unchanged) → returns `response.id`.
2. Frontend opens a stream to GET `/api/stream-response?response-id=<id>` (Edge).
3. Edge calls OpenAI `GET /v1/responses/{id}` with `stream: true`, pipes the event stream to the client (SSE or chunked).
4. Frontend consumes events (e.g. `response.web_search_call.searching`, `response.output_text.delta`), updates UI with “Searching…”, “Found sources”, incremental text.
5. On stream end (or final event), if the response contains the JSON array, parse it. Then either (a) call read-thread once to get resolved products (same as today), or (b) extend Edge to parse output_text and call resolvers (complex). Simplest: stream shows progress only; when stream ends with `status: completed`, frontend calls read-thread once to get the final resolved list (so one poll at the end).

**Backend**

- **Edge function** `netlify/edge-functions/stream-response.ts`:
  - Path: `/api/stream-response`.
  - Input: `response-id` query param.
  - Use `fetch()` to OpenAI `GET https://api.openai.com/v1/responses/{id}?stream=true` with `Authorization: Bearer OPEN_AI_KEY`.
  - Read env via `Netlify.env.get('OPEN_AI_KEY')` (Edge supports this).
  - Return `new Response(openAIStream.body, { headers: { 'Content-Type': 'text/event-stream' } })` (or whatever format OpenAI returns) so the client receives the raw stream. Alternatively, parse OpenAI events and re-emit as your own SSE for a simpler client contract.
  - No 26s limit issue; Edge can hold the stream open while I/O-bound.

**Frontend**

- When streaming mode: after assistant returns id, `fetch('/api/stream-response?response-id=' + id, { signal })` with `ReadableStream` body, or `EventSource` if we use SSE. Parse events and set state (e.g. “Searching web…”, “Reading sources”, partial text). On stream end, if we only streamed for UX: call read-thread once to get resolved recommendations and show them.

**Cost:** One long-lived Edge invocation per search (duration = time until OpenAI stream ends). Billed on duration; no serverless polling.

---

## Summary

|        | Polling (default)     | Streaming                    |
|--------|------------------------|-----------------------------|
| Toggle | `?stream=0` or localStorage `polling` | `?stream=1` or localStorage `streaming` |
| Backend | read-thread: single retrieve, 202 if pending | Edge: proxy OpenAI stream          |
| Frontend | Poll read-thread every 3s, no sleep   | Stream from Edge, then optional read-thread at end |
| Cost   | Many short serverless calls          | One long Edge call per search      |
