# Shareable search results

Plan for caching search results so users can share a stable link. Results are **only persisted when the user clicks "Share"**; no automatic save on search complete.

---

## 1. Blob key design

- **Store name:** `search-results` (one Netlify Blob store).
- **Payload blob:** `results/{YYYY-MM-DD}/{slug}` → full JSON (slug, query, title, description, dugAt, recommendations, resolvedLinks). `slug` = short id (e.g. nanoid(8)).
- **Slug index:** `slug-index/{slug}` → string value = full payload key, e.g. `results/2025-03-14/a1b2c3d4`. Lets `/results/[slug]` do one lookup by slug, then one get by payload key.
- **Cleanup:** List keys under `results/`; parse date from key; delete if older than retention. No need to read blob bodies.

---

## 2. Save API

- **Route:** `POST /api/save-result` (Netlify Function).
- **Body:** `{ query, recommendations, resolvedLinks? }` (same shape as prebake payload; title/description/dugAt computed server-side).
- **Logic:**
  - Generate `slug = nanoid(8)` (or 10).
  - `dateKey = new Date().toISOString().slice(0, 10)` (YYYY-MM-DD).
  - Build payload: `{ slug, query, title, description, dugAt: new Date().toISOString(), recommendations, resolvedLinks: resolvedLinks ?? {} }`.
  - Blobs:  
    - `set('results/' + dateKey + '/' + slug, payload)`  
    - `set('slug-index/' + slug, 'results/' + dateKey + '/' + slug)`
  - Return `{ slug }`.
- **Auth:** Optional rate-limit or same-origin; no user auth unless desired.

---

## 3. Results page (serve at `$domain/results/$slug`)

- **Route:** `app/results/[slug]/page.jsx` (dynamic; no generateStaticParams).
- **Logic:**
  - Get slug from params.
  - Get store → `get('slug-index/' + slug)` → payload key. If missing → `notFound()`.
  - `get(payloadKey)` → payload JSON. If missing → `notFound()`.
  - Render same UI as `/best/[slug]` (reuse BestPageContent or shared component) with that payload.
- **Runtime:** Node if using Blobs from Next server; else call a small Netlify Function that does the two gets and returns JSON, page fetches and renders.

---

## 4. Client: Share button (persist only on click)

- **Do not** call the save API when a search completes.
- When there are results, show a **"Share"** (or **"Get shareable link"**) button.
- **On Share click:**
  1. `POST /api/save-result` with current result (query, recommendations, resolvedLinks if available).
  2. On success, receive `{ slug }`.
  3. Update URL: `router.replace('/results/' + slug)` and/or copy `https://{domain}/results/{slug}` to clipboard and show "Link copied!".
- Only shared results are stored; reduces blob growth.

---

## 5. Cleanup cron (daily, delete older than 30 days)

- **Function:** `netlify/functions/cleanup-result-blobs/index.mts`.
  - Get store `search-results`.
  - List keys with prefix `results/`.
  - Cutoff = today minus 30 days (or `RESULT_BLOB_RETENTION_DAYS` env).
  - For each key `results/YYYY-MM-DD/slug`: if `YYYY-MM-DD < cutoffDateStr`:
    - `delete(key)` (payload blob).
    - `delete('slug-index/' + slug)` (extract slug from key).
- **Schedule:** In `netlify.toml`:
  ```toml
  [functions."cleanup-result-blobs"]
    schedule = "0 3 * * *"
  ```
  (Daily at 03:00 UTC.)
- Optional: env `RESULT_BLOB_RETENTION_DAYS=30` (default 30).

---

## 6. Dependencies and config

- Add `nanoid` if not present (slug generation).
- Ensure `@netlify/blobs` is available in the runtime that runs the save API, results page, and cleanup function.

---

## 7. Order of implementation

1. Implement **save API** (key format + slug-index writes).
2. Implement **results page** (slug-index → payload key → payload; render shared UI).
3. Add **Share button** to UI; on click call save API then update URL / copy link.
4. Implement **cleanup function** (list `results/`, delete by date + slug-index); add **schedule** in `netlify.toml`.
