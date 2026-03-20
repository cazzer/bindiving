import posthog from 'posthog-js'

/**
 * Send an event immediately instead of batching. Use when the user is about to
 * navigate (SPA or new tab) so the request is less likely to be dropped before flush.
 */
export function captureImmediate(eventName, properties) {
  posthog.capture(eventName, properties ?? null, { send_instantly: true })
}
