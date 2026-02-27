<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Bin Diving Next.js App Router application. Here's a summary of what was done:

- **Installed** `posthog-js` via npm
- **Initialized** PostHog client-side in `instrumentation-client.js` (Next.js 15.3+ recommended approach), alongside the existing Sentry setup. Includes automatic exception capture and a reverse proxy via `/ingest` to reduce tracking-blocker interference.
- **Added reverse proxy rewrites** to `next.config.js` so PostHog requests route through `/ingest` instead of directly to `us.i.posthog.com`.
- **Instrumented 7 events** across 3 files covering the full user journey: search submission, AI result delivery, product engagement, and error states.
- **Environment variables** set in `.env.local` (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`).

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `search_submitted` | User submits a product search query (initial search) | `app/page.jsx` |
| `search_results_received` | AI-powered product recommendations are returned and displayed | `app/page.jsx` |
| `more_options_requested` | User clicks "Give me more options" for additional recommendations | `app/page.jsx` |
| `suggested_search_clicked` | User clicks one of the suggested search terms on the homepage | `app/page.jsx` |
| `search_error` | An error occurred during the search (stream failure or invalid response) | `app/page.jsx` |
| `product_link_clicked` | User clicks the "View on Amazon" button on a product card | `components/product-card.jsx` |
| `feedback_submitted` | User submits the feedback form (success or failure recorded) | `components/feedback-form.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- 📊 **Dashboard — Analytics basics**: https://us.posthog.com/project/326587/dashboard/1317062
- 🔀 **Search → Results → Amazon Click Funnel**: https://us.posthog.com/project/326587/insights/gGgbm4gs
- 📈 **Daily Search Volume & Error Rate**: https://us.posthog.com/project/326587/insights/N1jJzefb
- 🛒 **Product Link Click-Through Rate (DAU)**: https://us.posthog.com/project/326587/insights/jVlgCHOK
- 🔁 **More Options Engagement**: https://us.posthog.com/project/326587/insights/ORibQ4Cj
- 💡 **Suggested vs. Manual Searches**: https://us.posthog.com/project/326587/insights/9KorUohx

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
