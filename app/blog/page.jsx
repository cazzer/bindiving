import Link from 'next/link'

import { Markdown } from '../../components/markdown'

const BLOG_OVERVIEW_MD = `
## Welcome to Bin Diving

We post small notes on how Bin Diving works, why we made certain choices, and what we're building next.
`

export default function BlogPage() {
  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl sm:text-4xl font-display font-bold">Blog</h1>
        <Markdown content={BLOG_OVERVIEW_MD} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-display text-base-content/70">Featured</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/blog/why-custom-search" className="link link-primary">
              Why custom search
            </Link>
          </li>
        </ul>
      </section>
    </main>
  )
}

