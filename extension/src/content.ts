/**
 * Content script — runs on Amazon product pages.
 * Injects a floating overlay panel with product evaluation.
 * Uses Shadow DOM to isolate styles from Amazon's CSS.
 */
import { evaluateProduct, resolveProduct, type EvaluationResult, type ResolvedProduct, type Alternative } from './api'
import { PANEL_CSS } from './panel-css'

const ASSOCIATE_ID = 'bindiving-20'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const CHECK_ICON = '<svg class="bd-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
const MINUS_ICON = '<svg class="bd-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'
const REFRESH_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
const MINIMIZE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'
const MAXIMIZE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>'
const CLOSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>'
const LOGO_URL = chrome.runtime.getURL('icons/favicon.svg')

// --- Product extraction ---

function extractASIN(): string | undefined {
  const match = window.location.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/)
  if (match) return match[1]
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  return canonical?.href?.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? undefined
}

function extractProductName(): string | undefined {
  return document.getElementById('productTitle')?.textContent?.trim() || undefined
}

function extractPrice(): string | undefined {
  const priceWhole = document.querySelector('.a-price .a-price-whole')
  const priceFraction = document.querySelector('.a-price .a-price-fraction')
  if (priceWhole?.textContent) {
    const whole = priceWhole.textContent.trim().replace(/[.,]$/, '')
    const fraction = priceFraction?.textContent?.trim() || '00'
    return `$${whole}.${fraction}`
  }
  const dealPrice = document.getElementById('priceblock_dealprice') ||
    document.getElementById('priceblock_ourprice') ||
    document.querySelector('#corePrice_feature_div .a-offscreen')
  return dealPrice?.textContent?.trim() || undefined
}

function extractCategory(): string | undefined {
  const breadcrumbs = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div li a')
  if (breadcrumbs.length > 0) {
    return breadcrumbs[breadcrumbs.length - 1]?.textContent?.trim() || undefined
  }
  return undefined
}

function productNameFromTitle(): string | null {
  const title = document.title
  if (!title) return null
  let cleaned = title
    .replace(/\s*[-–—|:]\s*Amazon\.\w+(\.\w+)?$/i, '')
    .replace(/^Amazon\.\w+(\.\w+)?\s*[:|-–—]\s*/i, '')
    .trim()
  const colonSplit = cleaned.split(/\s*:\s*/)
  if (colonSplit.length > 1) cleaned = colonSplit[0].trim()
  return cleaned.length > 3 ? cleaned : null
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

// --- Panel ---

let host: HTMLElement | null = null
let shadow: ShadowRoot | null = null
let minimized = false
let lastVerdict: { verdict: 'up' | 'down'; reason: string } | null = null
let shownAlternatives: Alternative[] = []

function getPanel(): { root: ShadowRoot; container: HTMLElement } {
  if (host && shadow) {
    return { root: shadow, container: shadow.getElementById('bd-panel')! }
  }

  host = document.createElement('div')
  host.id = 'bindiving-host'
  shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = PANEL_CSS
  shadow.appendChild(style)

  const panel = document.createElement('div')
  panel.id = 'bd-panel'
  panel.innerHTML = `
    <div class="bd-header">
      <img class="bd-logo" src="${LOGO_URL}" alt="">
      <a class="bd-title" href="https://bindiving.com" target="_blank" rel="noopener">Bin Diving</a>
      <span class="bd-mini-verdict"></span>
      <span class="bd-title-spacer"></span>
      <button class="bd-btn bd-redive" title="Re-dive">${REFRESH_ICON}</button>
      <button class="bd-btn bd-minimize" title="Minimize">${MINIMIZE_ICON}</button>
      <button class="bd-btn bd-close" title="Close">${CLOSE_ICON}</button>
    </div>
    <div class="bd-body">
      <div class="bd-state bd-loading">
        <div class="bd-spinner"></div>
        <p class="bd-status-text">Diving in...</p>
      </div>
      <div class="bd-state bd-error" style="display:none">
        <p class="bd-error-text"></p>
        <button class="bd-retry-btn">Try again</button>
      </div>
      <div class="bd-state bd-result" style="display:none">
        <div class="bd-verdict">
          <div class="bd-verdict-icon"></div>
          <div class="bd-verdict-body">
            <p class="bd-verdict-reason"></p>
            <div class="bd-verdict-sources"></div>
          </div>
        </div>
        <div class="bd-alternatives" style="display:none">
          <h2>Better options</h2>
          <div class="bd-alt-list"></div>
          <button class="bd-more-btn" style="display:none">Give me more options</button>
        </div>
      </div>
    </div>
  `
  shadow.appendChild(panel)
  document.body.appendChild(host)

  // Wire up buttons
  shadow.querySelector('.bd-close')!.addEventListener('click', hidePanel)
  shadow.querySelector('.bd-redive')!.addEventListener('click', () => {
    const btn = shadow!.querySelector('.bd-redive')!
    btn.classList.add('spinning')
    run(true).finally(() => btn.classList.remove('spinning'))
  })
  shadow.querySelector('.bd-retry-btn')!.addEventListener('click', () => run(true))
  shadow.querySelector('.bd-minimize')!.addEventListener('click', toggleMinimize)
  shadow.querySelector('.bd-more-btn')!.addEventListener('click', loadMoreOptions)

  // Draggable header
  let dragStartX = 0, dragStartY = 0, panelStartX = 0, panelStartY = 0, dragging = false

  const header = shadow.querySelector('.bd-header')! as HTMLElement
  header.addEventListener('pointerdown', (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.bd-btn, .bd-title')) return
    dragging = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    const rect = panel.getBoundingClientRect()
    panelStartX = rect.left
    panelStartY = rect.top
    header.setPointerCapture(e.pointerId)
    panel.style.transition = 'none'
  })

  header.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY
    let newX = panelStartX + dx
    let newY = panelStartY + dy
    // Clamp to viewport
    const w = panel.offsetWidth, h = panel.offsetHeight
    newX = Math.max(0, Math.min(window.innerWidth - w, newX))
    newY = Math.max(0, Math.min(window.innerHeight - h, newY))
    panel.style.left = `${newX}px`
    panel.style.top = `${newY}px`
    panel.style.right = 'auto'
  })

  header.addEventListener('pointerup', (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    panel.style.transition = ''
    header.releasePointerCapture(e.pointerId)
    // Persist position
    chrome.storage.local.set({ _panelPos: { left: panel.style.left, top: panel.style.top } })
  })

  // Restore saved position
  chrome.storage.local.get(['_panelPos', '_minimized']).then((data) => {
    if (data._panelPos) {
      panel.style.left = data._panelPos.left
      panel.style.top = data._panelPos.top
      panel.style.right = 'auto'
    }
    if (data._minimized) {
      minimized = true
      panel.classList.add('bd-minimized')
      const minBtn = shadow!.querySelector('.bd-minimize')!
      minBtn.innerHTML = MAXIMIZE_ICON
      minBtn.setAttribute('title', 'Expand')
    }
  })

  return { root: shadow, container: panel }
}

function toggleMinimize() {
  if (!shadow) return
  const panel = shadow.getElementById('bd-panel')!
  const minBtn = shadow.querySelector('.bd-minimize')!
  const badge = shadow.querySelector('.bd-mini-verdict')! as HTMLElement
  minimized = !minimized
  if (minimized) {
    panel.classList.add('bd-minimized')
    minBtn.innerHTML = MAXIMIZE_ICON
    minBtn.setAttribute('title', 'Expand')
    if (lastVerdict) {
      badge.textContent = lastVerdict.verdict === 'up' ? '\u{1F44D}' : '\u{1F44E}'
    }
  } else {
    panel.classList.remove('bd-minimized')
    minBtn.innerHTML = MINIMIZE_ICON
    minBtn.setAttribute('title', 'Minimize')
    badge.textContent = ''
  }
  chrome.storage.local.set({ _minimized: minimized })
}

function showPanel() {
  const { container } = getPanel()
  container.classList.add('bd-visible')
  chrome.storage.local.set({ _panelOpen: true })
}

function hidePanel() {
  if (shadow) {
    shadow.getElementById('bd-panel')?.classList.remove('bd-visible')
  }
  chrome.storage.local.set({ _panelOpen: false })
}

function isVisible(): boolean {
  return shadow?.getElementById('bd-panel')?.classList.contains('bd-visible') ?? false
}

function showState(state: 'loading' | 'error' | 'result') {
  if (!shadow) return
  shadow.querySelectorAll('.bd-state').forEach((el) => {
    ;(el as HTMLElement).style.display = 'none'
  })
  shadow.querySelector(`.bd-${state}`)!.style.display = ''
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// --- Rendering ---

function renderVerdictHeader(verdict: { verdict: 'up' | 'down'; reason: string; sources: string[] }) {
  if (!shadow) return
  showState('result')
  lastVerdict = { verdict: verdict.verdict, reason: verdict.reason }
  shadow.querySelector('.bd-verdict-icon')!.textContent = verdict.verdict === 'up' ? '\u{1F44D}' : '\u{1F44E}'
  shadow.querySelector('.bd-verdict-reason')!.textContent = verdict.reason

  const sourcesEl = shadow.querySelector('.bd-verdict-sources')! as HTMLElement
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
    sourcesEl.style.display = ''
  } else {
    sourcesEl.style.display = 'none'
  }
}

function renderVerdict(result: EvaluationResult, resolvedAlts?: (ResolvedProduct | null)[]) {
  if (!shadow) return
  renderVerdictHeader(result)

  if (result.verdict === 'down' && result.alternatives.length > 0) {
    const section = shadow.querySelector('.bd-alternatives')! as HTMLElement
    section.style.display = ''
    const list = shadow.querySelector('.bd-alt-list')!
    list.innerHTML = ''
    shownAlternatives = [...result.alternatives]

    result.alternatives.forEach((alt, i) => {
      const card = createAltCard(alt)
      list.appendChild(card)
      const cached = resolvedAlts?.[i]
      if (cached) { updateAltCard(card, cached) }
      else { resolveProduct(alt).then((r) => { if (r) updateAltCard(card, r) }) }
    })

    // Show "more options" button
    const moreBtn = shadow.querySelector('.bd-more-btn') as HTMLElement
    moreBtn.style.display = ''
  }
}

function loadMoreOptions() {
  if (!shadow) return
  const btn = shadow.querySelector('.bd-more-btn') as HTMLElement
  btn.textContent = 'Loading...'
  btn.setAttribute('disabled', '')

  const productName = extractProductName() || productNameFromTitle()
  if (!productName) return

  const exclude = shownAlternatives.map((a) => a.product_name)
  const product = {
    product_name: productName,
    price: extractPrice(),
    category: extractCategory(),
    asin: extractASIN() || undefined,
    exclude_products: exclude,
  }

  evaluateProduct(product, {
    onResult(result) {
      if (!shadow) return
      const list = shadow.querySelector('.bd-alt-list')!
      const newAlts = result.alternatives.filter(
        (alt) => !exclude.some((name) => name.toLowerCase() === alt.product_name.toLowerCase())
      )
      newAlts.forEach((alt) => {
        shownAlternatives.push(alt)
        const card = createAltCard(alt)
        list.appendChild(card)
        resolveProduct(alt).then((r) => { if (r) updateAltCard(card, r) })
      })
      btn.textContent = 'Give me more options'
      btn.removeAttribute('disabled')
      if (newAlts.length === 0) {
        btn.textContent = 'No more options found'
        setTimeout(() => { btn.textContent = 'Give me more options' }, 2000)
      }
    },
    onError() {
      btn.textContent = 'Give me more options'
      btn.removeAttribute('disabled')
    },
  })
}

function createAltCard(alt: Alternative): HTMLElement {
  const card = document.createElement('div')
  card.className = 'bd-alt-card'

  const imgPlaceholder = document.createElement('div')
  imgPlaceholder.className = 'bd-img-placeholder'
  card.appendChild(imgPlaceholder)

  const info = document.createElement('div')
  info.className = 'bd-alt-info'
  info.style.width = '100%'

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

async function run(bypassCache = false, alreadyShowing = false) {
  if (!alreadyShowing) showPanel()
  showState('loading')

  const asin = extractASIN()
  const productName = extractProductName() || productNameFromTitle()
  if (!productName) {
    if (shadow) {
      (shadow.querySelector('.bd-error-text') as HTMLElement).textContent = 'Could not detect a product on this page.'
      showState('error')
    }
    return
  }

  const cacheKey = asin || productName.toLowerCase().replace(/\s+/g, '-').slice(0, 60)

  if (!bypassCache) {
    const cached = await getCached(cacheKey)
    if (cached) {
      renderVerdict(cached.result, cached.resolvedAlts)
      return
    }
  }

  const product = {
    product_name: productName,
    price: extractPrice(),
    category: extractCategory(),
    asin: asin || undefined,
  }

  evaluateProduct(product, {
    onStatus(message) {
      if (shadow) (shadow.querySelector('.bd-status-text') as HTMLElement).textContent = message
    },
    onVerdict(verdict) {
      renderVerdictHeader(verdict)
    },
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
      if (shadow) {
        (shadow.querySelector('.bd-error-text') as HTMLElement).textContent = error
        showState('error')
      }
    },
  })
}

function isProductPage(): boolean {
  return /\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/.test(window.location.pathname) ||
    !!document.getElementById('productTitle')
}

function showIdlePanel() {
  showPanel()
  if (!shadow) return
  showState('loading')
  const statusText = shadow.querySelector('.bd-status-text') as HTMLElement
  statusText.textContent = ''
  const spinner = shadow.querySelector('.bd-spinner') as HTMLElement
  spinner.style.display = 'none'

  const goBtn = document.createElement('button')
  goBtn.className = 'bd-go-btn'
  goBtn.textContent = 'Go Diving'
  goBtn.addEventListener('click', () => {
    goBtn.remove()
    spinner.style.display = ''
    run(false, true)
  })
  shadow.querySelector('.bd-loading')!.appendChild(goBtn)
}

// Listen for toggle message from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TOGGLE_PANEL') {
    if (!isProductPage()) return
    if (isVisible()) { hidePanel() } else { showIdlePanel() }
  }
})

// Auto-restore panel if it was open on the previous page
if (isProductPage()) {
  chrome.storage.local.get('_panelOpen').then((data) => {
    if (data._panelOpen) showIdlePanel()
  })
}
