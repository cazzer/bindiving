/**
 * Popup script — lightweight version for initial release (no content_scripts needed).
 * Gets product info from the active tab's URL + title only.
 */
import { evaluateProduct, resolveProduct, type EvaluationResult, type ResolvedProduct, type Alternative } from './api'

const ASSOCIATE_ID = 'bindiving-20'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const CHECK_ICON = '<svg class="bd-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
const MINUS_ICON = '<svg class="bd-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'

function extractASINFromUrl(url: string): string | undefined {
  return url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/)?.[1]
}

function extractProductFromTitle(title: string): string | null {
  if (!title) return null
  let cleaned = title
    .replace(/\s*[-–—|:]\s*Amazon\.\w+(\.\w+)?$/i, '')
    .replace(/^Amazon\.\w+(\.\w+)?\s*[:|-–—]\s*/i, '')
    .trim()
  const colonSplit = cleaned.split(/\s*:\s*/)
  if (colonSplit.length > 1) cleaned = colonSplit[0].trim()
  return cleaned.length > 3 ? cleaned : null
}

function isAmazonProductUrl(url: string): boolean {
  return /^https?:\/\/(www|smile)\.amazon\.(com|co\.uk|ca|de|fr|it|es|co\.jp|com\.au|in|com\.br|com\.mx)\//.test(url) &&
    /\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/.test(url)
}

// --- Cache ---

interface CacheEntry {
  result: EvaluationResult
  resolvedAlts: (ResolvedProduct | null)[]
  timestamp: number
}

async function getCached(key: string): Promise<CacheEntry | null> {
  try {
    const data = await chrome.storage.local.get(key)
    const entry = data[key] as CacheEntry | undefined
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      chrome.storage.local.remove(key)
      return null
    }
    return entry
  } catch { return null }
}

async function setCache(key: string, result: EvaluationResult, resolvedAlts: (ResolvedProduct | null)[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: { result, resolvedAlts, timestamp: Date.now() } })
  } catch { /* not critical */ }
}

// --- DOM ---

function $(sel: string) { return document.querySelector(sel)! }

function showState(state: 'loading' | 'error' | 'result' | 'not-product') {
  document.querySelectorAll('.bd-state').forEach((el) => {
    (el as HTMLElement).style.display = 'none'
  })
  $(`.bd-${state}`).style.display = state === 'loading' ? 'flex' : 'block'
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// --- Rendering ---

function renderVerdictHeader(verdict: { verdict: 'up' | 'down'; reason: string; sources: string[] }) {
  showState('result')
  $('.bd-verdict-icon').textContent = verdict.verdict === 'up' ? '\u{1F44D}' : '\u{1F44E}'
  $('.bd-verdict-reason').textContent = verdict.reason

  const sourcesEl = $('.bd-verdict-sources') as HTMLElement
  sourcesEl.innerHTML = ''
  if (verdict.sources.length > 0) {
    verdict.sources.forEach((url) => {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      try { link.textContent = new URL(url).hostname.replace(/^www\./, '') } catch { link.textContent = url }
      sourcesEl.appendChild(link)
    })
    sourcesEl.style.display = 'flex'
  } else {
    sourcesEl.style.display = 'none'
  }
}

function renderVerdict(result: EvaluationResult, resolvedAlts?: (ResolvedProduct | null)[]) {
  renderVerdictHeader(result)

  if (result.verdict === 'down' && result.alternatives.length > 0) {
    const section = $('.bd-alternatives') as HTMLElement
    section.style.display = 'block'
    const list = $('.bd-alt-list')
    list.innerHTML = ''

    result.alternatives.forEach((alt, i) => {
      const card = createAltCard(alt)
      list.appendChild(card)
      const cached = resolvedAlts?.[i]
      if (cached) { updateAltCard(card, cached) }
      else { resolveProduct(alt).then((r) => { if (r) updateAltCard(card, r) }) }
    })
  }
}

function createAltCard(alt: Alternative): HTMLElement {
  const card = document.createElement('div')
  card.className = 'bd-alt-card'

  const imgPlaceholder = document.createElement('div')
  imgPlaceholder.className = 'bd-img-placeholder'
  card.appendChild(imgPlaceholder)

  const info = document.createElement('div')
  info.className = 'bd-alt-info'

  const name = document.createElement('div')
  name.className = 'bd-alt-name'
  name.textContent = alt.product_name
  info.appendChild(name)

  if (alt.price) {
    const price = document.createElement('div')
    price.className = 'bd-alt-price'
    price.textContent = alt.price
    info.appendChild(price)
  }

  if (alt.pros.length > 0) {
    const pros = document.createElement('div')
    pros.className = 'bd-alt-pros'
    pros.innerHTML = `<span class="bd-label">Pros</span><br>` +
      alt.pros.map((p) => `${CHECK_ICON} ${escapeHtml(p)}`).join('<br>')
    info.appendChild(pros)
  }

  if (alt.cons.length > 0) {
    const cons = document.createElement('div')
    cons.className = 'bd-alt-cons'
    cons.innerHTML = `<span class="bd-label">Cons</span><br>` +
      alt.cons.map((c) => `${MINUS_ICON} ${escapeHtml(c)}`).join('<br>')
    info.appendChild(cons)
  }

  card.appendChild(info)
  return card
}

function updateAltCard(card: HTMLElement, resolved: ResolvedProduct) {
  const placeholder = card.querySelector('.bd-img-placeholder')
  if (placeholder && resolved.image_url) {
    const img = document.createElement('img')
    img.src = resolved.image_url
    img.alt = resolved.product_name
    placeholder.replaceWith(img)
  }

  const amazonUrl = resolved.amazon_url || (resolved.amazon_id ? `https://www.amazon.com/dp/${resolved.amazon_id}/?tag=${ASSOCIATE_ID}` : null)
  if (amazonUrl) {
    const nameEl = card.querySelector('.bd-alt-name')
    if (nameEl && !nameEl.querySelector('a')) {
      const link = document.createElement('a')
      link.href = amazonUrl
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = nameEl.textContent || ''
      nameEl.textContent = ''
      nameEl.appendChild(link)
    }
    const info = card.querySelector('.bd-alt-info')
    if (info && !info.querySelector('.bd-amazon-link')) {
      const btn = document.createElement('a')
      btn.className = 'bd-amazon-link'
      btn.href = amazonUrl
      btn.target = '_blank'
      btn.rel = 'noopener'
      btn.textContent = 'View on Amazon'
      info.appendChild(btn)
    }
  }

  if (resolved.price) {
    const priceEl = card.querySelector('.bd-alt-price')
    if (priceEl) {
      priceEl.textContent = resolved.price
    } else {
      const info = card.querySelector('.bd-alt-info')
      const price = document.createElement('div')
      price.className = 'bd-alt-price'
      price.textContent = resolved.price
      const nameEl = info?.querySelector('.bd-alt-name')
      nameEl?.after(price)
    }
  }
}

// --- Main ---

async function run() {
  showState('loading')

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || !isAmazonProductUrl(tab.url)) {
    showState('not-product')
    return
  }

  const asin = extractASINFromUrl(tab.url)
  const productName = tab.title ? extractProductFromTitle(tab.title) : null
  if (!productName) {
    showState('not-product')
    return
  }

  const cacheKey = asin || productName.toLowerCase().replace(/\s+/g, '-').slice(0, 60)
  const cached = await getCached(cacheKey)
  if (cached) {
    renderVerdict(cached.result, cached.resolvedAlts)
    return
  }

  evaluateProduct({ product_name: productName, asin: asin || undefined }, {
    onStatus(message) {
      ($('.bd-status-text') as HTMLElement).textContent = message
    },
    onVerdict(verdict) { renderVerdictHeader(verdict) },
    onResult(result) {
      renderVerdict(result)
      if (result.alternatives.length > 0) {
        Promise.all(result.alternatives.map((alt) => resolveProduct(alt))).then((resolvedAlts) => {
          setCache(cacheKey, result, resolvedAlts)
        })
      } else {
        setCache(cacheKey, result, [])
      }
    },
    onError(error) {
      ($('.bd-error-text') as HTMLElement).textContent = error
      showState('error')
    },
  })
}

// Wire up retry button
$('.bd-retry-btn').addEventListener('click', () => run())

// Auto-search immediately on popup open
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (!tab?.url || !isAmazonProductUrl(tab.url)) {
    showState('not-product')
  } else {
    run()
  }
})
