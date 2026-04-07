import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Bin Diving',
  description: 'How Bin Diving handles your data.',
}

export default function PrivacyPage() {
  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10 pb-16">
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl font-display font-bold">
            Privacy Policy
          </h1>
          <p className="text-sm text-base-content/70 font-display">
            Last updated: April 7, 2026
          </p>
        </header>

        <div className="flex flex-col gap-4 max-w-3xl">
          <p className="text-base text-base-content/90 leading-relaxed">
            Bin Diving helps you evaluate Amazon products and find better alternatives.
            This policy explains what data we collect and how we use it across our
            website and Chrome extension.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">What we collect</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            When you use Bin Diving, we receive:
          </p>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>
              <strong>Product information you search for</strong> &mdash; the product name,
              price, and category from the Amazon page you are viewing. This is sent to our
              server to generate recommendations.
            </li>
            <li>
              <strong>Basic analytics</strong> &mdash; anonymous usage data (page views, feature
              usage) through PostHog to help us improve the product. No personal information is
              attached to these events.
            </li>
          </ul>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">What we do not collect</h2>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>We do not collect your name, email, or any account information.</li>
            <li>We do not track your browsing history or activity outside of Bin Diving.</li>
            <li>We do not sell or share your data with third parties.</li>
            <li>We do not store the Amazon pages you visit. Product queries are processed
              in real time and not retained.</li>
          </ul>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">Chrome extension</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            The Bin Diving Chrome extension runs only on Amazon product pages. It sends the
            product name and details from the page you are viewing to our server
            at <span className="font-mono text-sm">bindiving.com</span> to generate an evaluation.
            Results are cached locally on your device using Chrome&apos;s storage API to avoid
            repeat requests. The extension does not access any other websites or
            read any data outside of Amazon product pages.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">Third-party services</h2>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>
              <strong>OpenAI</strong> &mdash; product queries are sent to OpenAI&apos;s API to
              generate evaluations and recommendations. See{' '}
              <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer"
                className="link link-primary">OpenAI&apos;s privacy policy</a>.
            </li>
            <li>
              <strong>Amazon Product Advertising API</strong> &mdash; used to look up product
              images, prices, and links for recommended alternatives.
            </li>
            <li>
              <strong>PostHog</strong> &mdash; anonymous product analytics. See{' '}
              <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer"
                className="link link-primary">PostHog&apos;s privacy policy</a>.
            </li>
          </ul>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">Data storage</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            We do not maintain user accounts or databases of personal information.
            Product evaluations are cached temporarily to improve performance.
            The Chrome extension stores cached results locally on your device only.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">Contact</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            Questions? Reach us at{' '}
            <a href="mailto:hello@bindiving.com" className="link link-primary">
              hello@bindiving.com
            </a>.
          </p>
        </div>
      </article>
    </main>
  )
}
