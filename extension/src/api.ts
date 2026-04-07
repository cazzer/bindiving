/**
 * API client for the Chrome extension content script.
 * Relays all fetch requests through the background service worker
 * via chrome.runtime.connect (port messaging) to avoid CORS issues.
 */

export interface ProductInput {
  product_name: string
  price?: string
  category?: string
  asin?: string
  exclude_products?: string[]
}

export interface Alternative {
  product_name: string
  pros: string[]
  cons: string[]
  price: string | null
  amazon_id: string | null
  sources: string[]
}

export interface EvaluationResult {
  verdict: 'up' | 'down'
  reason: string
  sources: string[]
  alternatives: Alternative[]
}

export interface ResolvedProduct extends Alternative {
  amazon_url?: string
  image_url?: string
  brand?: string
  images?: string[]
}

export interface StreamCallbacks {
  onStatus?: (message: string) => void
  onVerdict?: (verdict: { verdict: 'up' | 'down'; reason: string; sources: string[] }) => void
  onResult?: (result: EvaluationResult) => void
  onError?: (error: string) => void
}

export function evaluateProduct(product: ProductInput, callbacks: StreamCallbacks): Promise<void> {
  const { onStatus, onVerdict, onResult, onError } = callbacks

  return new Promise((resolve) => {
    onStatus?.('Diving in...')

    const port = chrome.runtime.connect({ name: 'bindiving' })
    port.postMessage({ type: 'evaluate', product })

    port.onMessage.addListener((msg) => {
      if (msg.type === 'status') onStatus?.(msg.message)
      if (msg.type === 'verdict') onVerdict?.(msg.data)
      if (msg.type === 'result') { onResult?.(msg.data); resolve() }
      if (msg.type === 'error') { onError?.(msg.error); resolve() }
    })

    port.onDisconnect.addListener(() => resolve())
  })
}

export function resolveProduct(product: Alternative): Promise<ResolvedProduct | null> {
  return new Promise((resolve) => {
    const port = chrome.runtime.connect({ name: 'bindiving' })
    port.postMessage({ type: 'resolve', product, index: 0 })

    port.onMessage.addListener((msg) => {
      if (msg.type === 'resolved') {
        resolve(msg.data)
        port.disconnect()
      }
    })

    port.onDisconnect.addListener(() => resolve(null))
  })
}
