import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0
})

if (!dsn) {
  console.warn('[Sentry] Disabled in browser: NEXT_PUBLIC_SENTRY_DSN was not available at build time.')
}

const sentryClient = Sentry.getClient()
const clientDsn = sentryClient?.getOptions?.()?.dsn
console.info(`[Sentry] Client active: ${Boolean(sentryClient && clientDsn)}`)

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
