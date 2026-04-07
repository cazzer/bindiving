import { evaluateProduct, resolveProduct, type EvaluationResult, type ResolvedProduct, type Alternative } from './api'

const ASSOCIATE_ID = 'bindiving-20'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const CHECK_ICON = '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
const MINUS_ICON = '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'

// Match ASIN from Amazon product URLs:
// /dp/B0ABC12345, /gp/product/B0ABC12345, /gp/aw/d/B0ABC12345
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i

const $ = (id: string) => document.getElementById(id)!

function showState(id: string) {
  document.querySelectorAll('.state').forEach((el) => {
    ;(el as HTMLElement).style.display = 'none'
  })
  $(id).style.display = ''
}

function extractAsinFromUrl(url: string): string | null {
  const match = url.match(ASIN_RE)
  return match ? match[1].toUpperCase() : null
}

function isAmazonUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return /(?:^|\.)amazon\.[a-z.]+$/i.test(host)
  } catch {
    return false
  }
}

/**
 * Extract a usable product name from the Amazon page title.
 * Typical formats:
 *   "Product Name - Amazon.com"
 *   "Amazon.com: Product Name : Category"
 *   "Product Name : Category - Amazon.com"
 *   "Amazon.com : Product Name"
 */
function productNameFromTitle(title: string): string | null {
  if (!title) return null
  // Strip common Amazon suffixes/prefixes
  let cleaned = title
    .replace(/\s*[-–—|:]\s*Amazon\.\w+(\.\w+)?$/i, '')  // trailing " - Amazon.com"
    .replace(/^Amazon\.\w+(\.\w+)?\s*[:|-–—]\s*/i, '')   // leading "Amazon.com: "
    .trim()
  // If there's still a " : Category" suffix, take the first part
  const colonSplit = cleaned.split(/\s*:\s*/)
  if (colonSplit.length > 1) {
    cleaned = colonSplit[0].trim()
  }
  return cleaned.length > 3 ? cleaned : null
}

// --- Cache ---

interface CacheEntry {
  result: EvaluationResult
  resolvedAlts: (ResolvedProduct | null)[]
  timestamp: number
}

async function getCached(asin: string): Promise<CacheEntry | null> {
  try {
    const data = await chrome.storage.local.get(asin)
    const entry = data[asin] as CacheEntry | undefined
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      chrome.storage.local.remove(asin)
      return null
    }
    return entry
  } catch {
    return null
  }
}

async function setCache(asin: string, result: EvaluationResult, resolvedAlts: (ResolvedProduct | null)[]): Promise<void> {
  try {
    const entry: CacheEntry = { result, resolvedAlts, timestamp: Date.now() }
    await chrome.storage.local.set({ [asin]: entry })
  } catch {
    // storage full or unavailable — not critical
  }
}

// --- Rendering ---

function renderVerdictHeader(verdict: { verdict: 'up' | 'down'; reason: string; sources: string[] }) {
  showState('result')
  $('verdict-icon').textContent = verdict.verdict === 'up' ? '\u{1F44D}' : '\u{1F44E}'
  $('verdict-reason').textContent = verdict.reason

  // Render verdict sources
  const sourcesEl = $('verdict-sources')
  sourcesEl.innerHTML = ''
  if (verdict.sources.length > 0) {
    verdict.sources.forEach((url) => {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      try {
        link.textContent = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        link.textContent = url
      }
      sourcesEl.appendChild(link)
    })
    sourcesEl.style.display = ''
  } else {
    sourcesEl.style.display = 'none'
  }
}

function renderVerdict(result: EvaluationResult, resolvedAlts?: (ResolvedProduct | null)[]) {
  // Update header in case final parse has better data than the early extract
  renderVerdictHeader(result)

  if (result.verdict === 'down' && result.alternatives.length > 0) {
    $('alternatives-section').style.display = ''
    const list = $('alternatives-list')
    list.innerHTML = ''

    result.alternatives.forEach((alt, i) => {
      const card = createAltCard(alt)
      list.appendChild(card)

      // Use cached resolved data or fetch fresh
      const cached = resolvedAlts?.[i]
      if (cached) {
        updateAltCard(card, cached)
      } else {
        resolveProduct(alt).then((resolved) => {
          if (resolved) updateAltCard(card, resolved)
        })
      }
    })
  }
}

function createAltCard(alt: Alternative): HTMLElement {
  const card = document.createElement('div')
  card.className = 'alt-card'

  const imgPlaceholder = document.createElement('div')
  imgPlaceholder.className = 'img-placeholder'
  card.appendChild(imgPlaceholder)

  const info = document.createElement('div')
  info.className = 'alt-info'

  const name = document.createElement('div')
  name.className = 'alt-name'
  name.textContent = alt.product_name
  info.appendChild(name)

  if (alt.price) {
    const price = document.createElement('div')
    price.className = 'alt-price'
    price.textContent = alt.price
    info.appendChild(price)
  }

  if (alt.pros.length > 0) {
    const pros = document.createElement('div')
    pros.className = 'alt-pros'
    pros.innerHTML = `<span class="label">${CHECK_ICON} Pros</span><br>` +
      alt.pros.map((p) => `${CHECK_ICON} ${escapeHtml(p)}`).join('<br>')
    info.appendChild(pros)
  }

  if (alt.cons.length > 0) {
    const cons = document.createElement('div')
    cons.className = 'alt-cons'
    cons.innerHTML = `<span class="label">${MINUS_ICON} Cons</span><br>` +
      alt.cons.map((c) => `${MINUS_ICON} ${escapeHtml(c)}`).join('<br>')
    info.appendChild(cons)
  }

  card.appendChild(info)
  return card
}

function updateAltCard(card: HTMLElement, resolved: ResolvedProduct) {
  // Replace placeholder with image
  const placeholder = card.querySelector('.img-placeholder')
  if (placeholder && resolved.image_url) {
    const img = document.createElement('img')
    img.src = resolved.image_url
    img.alt = resolved.product_name
    placeholder.replaceWith(img)
  }

  // Wrap name in Amazon link
  const amazonUrl = resolved.amazon_url || (resolved.amazon_id ? `https://www.amazon.com/dp/${resolved.amazon_id}/?tag=${ASSOCIATE_ID}` : null)
  if (amazonUrl) {
    const nameEl = card.querySelector('.alt-name')
    if (nameEl && !nameEl.querySelector('a')) {
      const link = document.createElement('a')
      link.href = amazonUrl
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = nameEl.textContent || ''
      nameEl.textContent = ''
      nameEl.appendChild(link)
    }

    // Add "View on Amazon" button
    const info = card.querySelector('.alt-info')
    if (info && !info.querySelector('.alt-amazon-link')) {
      const btn = document.createElement('a')
      btn.className = 'alt-amazon-link'
      btn.href = amazonUrl
      btn.target = '_blank'
      btn.rel = 'noopener'
      btn.textContent = 'View on Amazon'
      info.appendChild(btn)
    }
  }

  // Update price if resolved has a better one
  if (resolved.price) {
    const priceEl = card.querySelector('.alt-price')
    if (priceEl) {
      priceEl.textContent = resolved.price
    } else {
      const info = card.querySelector('.alt-info')
      const price = document.createElement('div')
      price.className = 'alt-price'
      price.textContent = resolved.price
      const nameEl = info?.querySelector('.alt-name')
      if (nameEl?.nextSibling) {
        info?.insertBefore(price, nameEl.nextSibling)
      } else {
        info?.appendChild(price)
      }
    }
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// --- Main ---

async function run(bypassCache = false) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url || ''

  if (!tab?.id || !isAmazonUrl(url)) {
    showState('not-amazon')
    return
  }

  // Try to get product info from multiple sources, best to worst:
  // 1. Content script DOM scrape (#productTitle, price, category)
  // 2. Page title (tab.title)
  // 3. ASIN from URL (last resort identifier)
  const asin = extractAsinFromUrl(url)
  const titleName = productNameFromTitle(tab.title || '')
  const pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' }).catch(() => null)

  const productName = pageInfo?.product_name || titleName
  if (!productName) {
    showState('not-amazon')
    return
  }

  // Cache key: ASIN if available, otherwise hash the product name
  const cacheKey = asin || productName.toLowerCase().replace(/\s+/g, '-').slice(0, 60)

  // Check cache first
  if (!bypassCache) {
    const cached = await getCached(cacheKey)
    if (cached) {
      renderVerdict(cached.result, cached.resolvedAlts)
      return
    }
  }

  showState('loading')

  const product = {
    product_name: productName,
    price: pageInfo?.price,
    category: pageInfo?.category,
    asin: asin || undefined,
  }

  evaluateProduct(product, {
    onStatus(message) {
      $('status-text').textContent = message
    },
    onVerdict(verdict) {
      renderVerdictHeader(verdict)
    },
    onResult(result) {
      renderVerdict(result)

      // Resolve alternatives then cache everything
      if (result.alternatives.length > 0) {
        Promise.all(result.alternatives.map((alt) => resolveProduct(alt))).then((resolvedAlts) => {
          setCache(cacheKey, result, resolvedAlts)
        })
      } else {
        setCache(cacheKey, result, [])
      }
    },
    onError(error) {
      $('error-text').textContent = error
      showState('error')
    },
  })
}

// Re-dive button bypasses cache
const rediveBtn = $('redive-btn')
rediveBtn.addEventListener('click', () => {
  rediveBtn.classList.add('spinning')
  run(true).finally(() => rediveBtn.classList.remove('spinning'))
})

// Retry (error state) also bypasses cache
$('retry-btn').addEventListener('click', () => run(true))

// Auto-dive on open
run()
