/**
 * Content script — runs on Amazon product pages.
 * Extracts product info and sends it to the popup via chrome.runtime messages.
 */

interface ProductInfo {
  product_name: string
  price?: string
  category?: string
  asin?: string
}

function extractASIN(): string | undefined {
  // From URL: /dp/ASIN or /gp/product/ASIN
  const match = window.location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)
  if (match) return match[1]
  // Fallback: canonical link
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const canonicalMatch = canonical?.href?.match(/\/dp\/([A-Z0-9]{10})/)
  return canonicalMatch?.[1] ?? undefined
}

function extractProductName(): string | undefined {
  const el = document.getElementById('productTitle')
  return el?.textContent?.trim() || undefined
}

function extractPrice(): string | undefined {
  // Try the main price display
  const priceWhole = document.querySelector('.a-price .a-price-whole')
  const priceFraction = document.querySelector('.a-price .a-price-fraction')
  if (priceWhole?.textContent) {
    const whole = priceWhole.textContent.trim().replace(/[.,]$/, '')
    const fraction = priceFraction?.textContent?.trim() || '00'
    return `$${whole}.${fraction}`
  }
  // Fallback: deal price or other price selectors
  const dealPrice = document.getElementById('priceblock_dealprice') ||
    document.getElementById('priceblock_ourprice') ||
    document.querySelector('#corePrice_feature_div .a-offscreen')
  return dealPrice?.textContent?.trim() || undefined
}

function extractCategory(): string | undefined {
  // Breadcrumb category
  const breadcrumbs = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div li a')
  if (breadcrumbs.length > 0) {
    const last = breadcrumbs[breadcrumbs.length - 1]
    return last?.textContent?.trim() || undefined
  }
  return undefined
}

function getProductInfo(): ProductInfo | null {
  const product_name = extractProductName()
  if (!product_name) return null
  return {
    product_name,
    price: extractPrice(),
    category: extractCategory(),
    asin: extractASIN(),
  }
}

// Respond to popup requests for product info
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PRODUCT_INFO') {
    sendResponse(getProductInfo())
  }
})
