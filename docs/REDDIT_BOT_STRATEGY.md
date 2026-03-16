# Reddit bot: Netlify scheduled → background function

Strategy for a bot that watches a subreddit, derives a Bin Diving query from each new post, runs search + enrichment, and comments with top 1–2 results (including Amazon links with attribution).

---

## 1. High-level flow

```
Scheduled (every 2h, <30s)
  → Fetch new posts from subreddit
  → For each new post: POST to background function with post id + metadata
  → Return

Background (per post, up to 15 min)
  → 1. OpenAI: post title/body → Bin Diving query or "skip"
  → 2. Run Bin Diving search (reuse existing logic via imports)
  → 3. Format comment (template + optional OpenAI), add Amazon tag
  → 4. Post comment on Reddit
```

---

## 2. Enrichment and DRY: how the frontend works today

- **Streaming path:** `stream-search` (edge) → frontend consumes stream, gets raw recommendations from stream parsing → frontend calls **`/api/resolve-product`** once per product to get `amazon_url`, image, etc.
- **Polling path:** `assistant` (returns response id) → frontend polls **`/api/read-thread?response-id=...`** until completed → read-thread does **`resolveRecommendations()`** (batch) and returns enriched list.

So enrichment is either:
- **Batch:** `read-thread` = `openai.responses.retrieve` + parse `output_text` + `resolveRecommendations(recommendations)` (brave → cheerio → amazon resolvers).
- **Per-item:** `resolve-product` = `resolveOne(recommendation)` (same resolvers).

For the bot we want the **batch** path so we don’t make N HTTP calls from the background function. That means we run the same logic as read-thread **inside the background function** by importing shared code, not by calling `/api/read-thread` (which would work but adds HTTP and would need an internal secret to bypass any auth).

---

## 3. Shared modules (keep logic DRY)

All of this lives under `netlify/functions/` so Netlify bundles it for both the existing handlers and the new Reddit background function.

### 3.1 Create recommendation response (no captcha)

- **New file:** `netlify/functions/recommendations/create-response.mts`
- **Exports:** `createRecommendationResponse(query: string): Promise<{ responseId: string }>`
- **Does:** `openai.responses.create({ background: true, input: [system: BASE_SYSTEM_PROMPT, user: getUserMessage(query)], model: 'gpt-4o', tools: [{ type: 'web_search' }] })` → return `response.id`.
- **Uses:** `BASE_SYSTEM_PROMPT`, `getUserMessage` from existing `recommendation-prompt` (shared). No recaptcha.
- **Optional refactor:** `assistant/index.mts` can call this after captcha so the “create” logic lives in one place.

### 3.2 Fetch and resolve recommendations (batch)

- **New file:** `netlify/functions/recommendations/fetch-resolved.mts`
- **Exports:**  
  `fetchResolvedRecommendations(responseId: string): Promise<  
    | { status: 'pending' }  
    | { status: 'completed'; recommendations: ResolvedRecommendation[] }  
    | { status: 'error'; message: string }  
  >`
- **Does:**  
  - `openai.responses.retrieve(responseId, include: [...])`  
  - If `status !== 'completed'` → return `{ status: 'pending' }`  
  - Else parse `output_text` as JSON array, then `resolveRecommendations(parsed)` and return `{ status: 'completed', recommendations }` or `{ status: 'error', message }`.
- **Uses:** Existing `resolveRecommendations` from `resolve-recommendations.mts` (and thus all resolvers). Same types as read-thread.
- **Optional refactor:** `read-thread/index.mts` can call `fetchResolvedRecommendations` and then map result to HTTP response (202 vs 200 vs error). That keeps one implementation of “retrieve + parse + resolve.”

### 3.3 Amazon link with attribution

- **New file:** `netlify/functions/recommendations/amazon-link.mts` (or a small shared util)
- **Exports:** `makeAmazonLink(asin: string, tag?: string): string`  
  - Default tag from env `AMAZON_ASSOCIATE_TAG` or fallback `'bindiving-20'`.  
  - Returns `https://www.amazon.com/dp/${asin}/?tag=${tag}`.  
  - For resolved products that already have `amazon_url`, we can append `?tag=...` (or use asin when available so link is consistent).
- **Use:** Reddit comment formatter and, if desired, frontend/product-card can later use this from a shared place (optional).

---

## 4. Background function: step-by-step

**File:** `netlify/functions/reddit-process-post-background.mts`  
**Invocation:** POST from scheduled function with body `{ postId, subreddit, title, body, permalink, ... }`. Protect with a shared secret header (e.g. `x-internal-secret`) or Netlify-only env so only the scheduler can call it.

### Step 1: Post → query or skip (OpenAI)

- **Input:** `title`, `body` (and optionally subreddit).
- **Prompt (new, in shared or in function):** Ask the model to output either a short product-search query suitable for Bin Diving (one line, e.g. “bamboo bath mat”) or a flag like `skip: true` with a brief reason if the post is not a product recommendation request (e.g. meta, joke, not shopping).
- **Output:** `{ query?: string, skip?: boolean, reason?: string }`. If `skip`, exit without commenting (optionally log reason).
- **Implementation:** One small OpenAI call (e.g. chat completions or responses with a single user message). Keep prompt short to reduce cost and latency.

### Step 2: Bin Diving search (reuse logic)

- Call `createRecommendationResponse(query)` → get `responseId`.
- Poll `fetchResolvedRecommendations(responseId)` every 3s until `status === 'completed'` or `status === 'error'` (with a max wait, e.g. 90s).
- On `completed`, take `recommendations.slice(0, 2)` (top 1–2). On `error` or timeout, skip commenting or post a short “couldn’t find recommendations this time” (your choice).

No new HTTP endpoints; all via direct imports of the new modules and existing `resolve-recommendations.mts`.

### Step 3: Format comment (links + attribution)

- **Option A (simplest):** Template in code. For each product: name, 1–2 pros, price if present, and link. Use `makeAmazonLink(product.amazon_id || extractAsinFromUrl(product.amazon_url), process.env.AMAZON_ASSOCIATE_TAG || 'bindiving-20')` so every Amazon link has the attribution tag. Add a short “I’m Bin Diving bot” / disclaimer line and link to your site.
- **Option B:** Second OpenAI call: “Given this Reddit post and these 1–2 product recommendations (with names, pros, price), write a helpful, concise Reddit comment (2–4 sentences) that includes the product names and Amazon links. Use this link format: [Product Name](url).” Then inject the real URLs (with tag) into the model output or build the links in code from the model’s structure. Option B is more flexible but adds latency and cost; start with A and add B later if you want more variety.

Reddit markdown: `[text](url)`. Ensure URLs use the attribution tag.

### Step 4: Post comment on Reddit

- Use Reddit API: `POST /api/comment` with `parent` = fullname of the post (e.g. `t3_xxxxx`), `text` = formatted comment body.
- Auth: Reddit OAuth (script app or installed app) stored in Netlify env (e.g. `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN`). Background function refreshes access token if needed, then posts.
- Idempotency: Before commenting, check (e.g. via Reddit API “get my comments” or a small store) that you haven’t already commented on this post. Alternatively, store “processed post ids” in Netlify Blobs or similar so the scheduler doesn’t re-dispatch the same post.

---

## 5. Scheduled function (dispatcher)

**File:** `netlify/functions/reddit-scheduled.mts`  
**Schedule:** `0 */2 * * *` (every 2 hours, UTC).

- Fetch recent posts from the target subreddit (e.g. `GET /r/{subreddit}/new.json`, limit 10–25).
- For each post: if not already processed (see idempotency above), POST to `https://{NETLIFY_SITE_URL}/.netlify/functions/reddit-process-post-background` with body `{ postId, subreddit, title, body, permalink, ... }` and header `x-internal-secret: process.env.INTERNAL_CRON_SECRET`.
- **Idempotency:** Keep a small “processed” set. Options: (1) Netlify Blobs keyed by post id (e.g. `reddit-processed/{postId}`); (2) in-memory only for the run (then same post could be sent again in 2h — acceptable if background checks “already commented”); (3) Reddit: list bot’s comments and skip if post id already has a comment. (2) + (3) is simplest: scheduler sends every “new” post; background function checks “have I already commented on this post?” and exits if yes.
- Stay under 30s: only do listing + filtering + N POSTs to background; no heavy work.

---

## 6. Environment and security

- **Netlify env (site or function):**
  - Existing: `OPEN_AI_KEY`, resolver keys (`BRAVE_API_KEY`, etc.), `AMAZON_ASSOCIATE_TAG` (optional, default `bindiving-20`).
  - Reddit: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN` (or equivalent for your app type).
  - Internal: `INTERNAL_CRON_SECRET` (scheduled function sends it; background function verifies it so only your scheduler can trigger the worker).
- **Background function URL:** Not publicly documented; protection by `INTERNAL_CRON_SECRET`. Optionally restrict by Netlify’s “only allow from same site” if supported, or leave as secret-header-only.

---

## 7. File and dependency summary

| Piece | Location | Purpose |
|-------|----------|--------|
| `create-response.mts` | `netlify/functions/recommendations/` | Create OpenAI response (no captcha); used by bot and optionally assistant. |
| `fetch-resolved.mts` | `netlify/functions/recommendations/` | Retrieve + parse + resolveRecommendations; used by read-thread and bot. |
| `amazon-link.mts` | `netlify/functions/recommendations/` or shared | `makeAmazonLink(asin, tag)` for Reddit (and optionally frontend). |
| Reddit → query prompt | In background function or `netlify/shared/reddit-query-prompt.ts` | Single OpenAI call: title/body → query or skip. |
| `reddit-process-post-background.mts` | `netlify/functions/` | Steps 1–4: query/skip → search → format comment → post. |
| `reddit-scheduled.mts` | `netlify/functions/` | Cron: fetch new posts, POST each to background. |
| `netlify.toml` | Root | `[functions."reddit-scheduled"] schedule = "0 */2 * * *"`. |

Existing code to reuse as-is (imports only):

- `resolve-recommendations.mts` (and all resolvers)
- `netlify/shared/recommendation-prompt.ts` (BASE_SYSTEM_PROMPT, getUserMessage)

Optional refactors (not required for bot):

- `assistant/index.mts` → call `createRecommendationResponse(query)` after captcha.
- `read-thread/index.mts` → call `fetchResolvedRecommendations(responseId)` and map to HTTP.

---

## 8. Order of implementation

1. **Shared modules:** `create-response.mts`, `fetch-resolved.mts`, `amazon-link.mts`; optionally refactor read-thread and assistant to use them.
2. **Reddit → query:** Implement step 1 (OpenAI) and step 4 (Reddit OAuth + comment) in the background function with a hardcoded test post so you can verify “query + comment” without search.
3. **Bin Diving in background:** Wire steps 2 and 3 (search via create + fetch-resolved, then format comment with Amazon links).
4. **Scheduled function:** Implement `reddit-scheduled.mts`, idempotency, and POST to background; add schedule in `netlify.toml`.
5. **Tuning:** Rate limiting (Reddit), error handling, and whether to add an optional OpenAI pass for comment wording (step 3 option B).

This keeps everything on Netlify, reuses all enrichment logic via imports, and keeps the 30–40s work inside the 15-minute background function.

---

## 9. Alternative: Devvit app (Reddit’s platform)

Reddit has tightened public API access. **Devvit** is Reddit’s app platform; apps run on Reddit’s infrastructure and get Reddit API access **without you managing API keys**. That avoids the need for Reddit credentials on Netlify.

### What Devvit supports

- **Cron:** Recurring tasks in `devvit.json` with a cron expression (e.g. `"0 */2 * * *"`). Reddit calls your app endpoint on schedule (e.g. `POST /internal/scheduler/check-new-posts`).
- **Comment on posts:** `reddit.submitComment({ postId: 't3_xxxxx', text: '...' })`. Auth is handled by Devvit.
- **Trigger on new post:** `Devvit.addTrigger({ event: 'PostSubmit', onEvent: async (event, context) => { ... } })` runs when a new post is created — often better than polling on a cron.

So you can build the bot as a **Devvit app** that: (1) runs on a schedule or on PostSubmit, (2) calls your Bin Diving backend (HTTP) to get the comment text, (3) calls `reddit.submitComment()` with that text. No Reddit API keys on your side.

### Constraint: 30s request timeout

Devvit Web endpoints have a **30 second** max request time. So:

- If the Devvit app **calls your Netlify API and waits** for the comment body, your API must respond in **&lt; 30s**. The current pipeline (query extraction + search + resolve + format) is ~30–40s, so you’re at or over the limit.
- **Ways to make it work:**
  - **Option A (recommended):** Optimize so your “bot” API finishes in under 30s (e.g. request only 1 recommendation, or a faster path), return `{ commentText }` (or `{ skip: true }`), and have Devvit call `submitComment`. No Reddit credentials on Netlify.
  - **Option B:** Devvit calls your API; your API returns **202** and processes in the background, then **your backend** posts the comment via the Reddit API. That requires Reddit API credentials on Netlify again, which defeats the “use Devvit to avoid API access” benefit.

### Suggested Devvit flow

1. **PostSubmit trigger** (or cron): when a new post appears, schedule a **one-off job** with `context.scheduler.runJob({ name: 'process-post', when: new Date(Date.now() + 5000), data: { postId, title, body, permalink } })` so the trigger returns quickly.
2. **Job handler** (runs when the one-off fires): `fetch(process.env.BIN_DIVING_BOT_URL, { method: 'POST', body: JSON.stringify({ postId, title, body }), headers: { 'x-secret': process.env.INTERNAL_SECRET } })`. Your Netlify endpoint does query extraction + search + format and returns `{ commentText }` in **&lt; 30s** (or `{ skip: true }`).
3. If `commentText` is present, `context.reddit.submitComment({ postId, text: commentText })`.

Shared modules (create-response, fetch-resolved, amazon-link) and the “internal” Netlify endpoint stay the same; you either add a **sync** “bot” endpoint that runs the full pipeline and is optimized to stay under 30s, or you accept occasional timeouts and skip commenting for those posts.
