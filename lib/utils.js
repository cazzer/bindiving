import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names and resolves Tailwind conflicts so consumer overrides win.
 * Use for any reusable component that accepts className.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
