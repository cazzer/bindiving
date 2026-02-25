import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names and resolves Tailwind conflicts so consumer overrides win.
 * Use for any reusable component that accepts className.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * True if the string looks like a real source URL (http/https with a proper host).
 * Filters out placeholder URLs the model sometimes returns (e.g. https://turn0search2).
 */
export function isValidSourceUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  if (!u) return false
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const host = parsed.hostname
    if (!host) return false
    if (host === 'localhost') return true
    if (!host.includes('.')) return false
    return true
  } catch {
    return false
  }
}
