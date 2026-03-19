import Link from 'next/link'

export default function WhyCustomSearchPage() {
  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10 pb-16">
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl font-display font-bold">
            Why You Should Use a Custom Search Engine for Amazon
          </h1>
          <p className="text-sm text-base-content/70 font-display">
            A short explanation of what we mean by “custom search.”
          </p>
        </header>

        <div className="flex flex-col gap-4 max-w-3xl">
          <p className="text-base text-base-content/90 leading-relaxed">
            Amazon used to feel like a search engine for products. These days, it can feel more like a marketplace
            layered over ads, SEO, and a lot of sponsored listings.
          </p>

          <p className="text-base text-base-content/90 leading-relaxed">
            If you have shopped for something recently, like a $20 kitchen tool, a phone charger, or a trunk organizer,
            you have probably noticed a familiar pattern:
          </p>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>many near-duplicate products</li>
            <li>brand names and titles that feel generic</li>
            <li>review counts that look impressive, but do not always answer the question you actually have</li>
            <li>promoted listings that may or may not be a good match</li>
          </ul>

          <blockquote className="mt-2 mb-2 pl-4 border-l-4 border-primary text-base-content/80 italic">
            At some point, even a simple purchase turns into a 20-minute research project.
          </blockquote>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">The real issue: incentives</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            Amazon&apos;s incentives are not perfectly aligned with yours. Their goal is to maximize conversions and
            keep shoppers on the platform.
          </p>
          <p className="text-base text-base-content/90 leading-relaxed">
            That does not automatically mean the highest-quality product rises to the top first. Instead, search results
            often become a mix of:
          </p>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>ads</li>
            <li>SEO-optimized listings</li>
            <li>review-optimized listings</li>
          </ul>

          <p className="text-base text-base-content/90 leading-relaxed">
            Quality is in there, somewhere. It is just buried.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">What a quality-first layer does</h2>

          <p className="text-base text-base-content/90 leading-relaxed">This is where a custom search engine helps.</p>

          <p className="text-base text-base-content/90 leading-relaxed">
            Instead of asking, &quot;What ranks highest on Amazon?&quot; you start with a different question: &quot;What
            actually looks like a good product?&quot;
          </p>

          <p className="text-base text-base-content/90 leading-relaxed font-display">A custom layer can:</p>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>downweight or ignore sponsored listings</li>
            <li>look at how reviews are distributed, not only the average rating</li>
            <li>filter obvious duplicates or low-effort listings</li>
            <li>cross-check signals across multiple sources</li>
          </ul>

          <p className="text-base text-base-content/90 leading-relaxed">
            The goal is not to replace Amazon. It is to clean up the inputs so you spend less time sorting and more time
            choosing.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">Better defaults, not perfection</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            No system will identify the best product perfectly for every person in every situation. You do not need
            perfect. You need better defaults.
          </p>

          <p className="text-base text-base-content/90 leading-relaxed">
            Going from a couple hundred questionable listings to a smaller set of solid candidates is a meaningful
            improvement. Less noise, fewer bad options, and a decision you can feel good about.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">The real benefit: time and confidence</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            Most people do not mind researching big purchases. What they mind is the cost of thinking for everyday
            items.
          </p>

          <p className="text-base text-base-content/90 leading-relaxed">
            A quality-first search layer compresses that process:
          </p>

          <ul className="list-disc pl-6 space-y-2 text-base-content/90 leading-relaxed">
            <li>less scrolling</li>
            <li>fewer second guesses</li>
            <li>fewer tabs open comparing similar products</li>
          </ul>

          <p className="text-base text-base-content/90 leading-relaxed">
            You make a decision faster, and you are more confident you picked the right thing.
          </p>

          <h2 className="text-xl sm:text-2xl font-display font-bold mt-2">A small shift that adds up</h2>

          <p className="text-base text-base-content/90 leading-relaxed">
            Using a custom search engine for Amazon is not about being a power user. It is about opting out of the
            default experience.
          </p>

          <p className="text-base text-base-content/90 leading-relaxed">
            Instead of accepting: &quot;This is what Amazon shows me&quot;, you switch to: &quot;Show me the stuff that
            is actually worth considering.&quot;
          </p>

          <p className="text-base text-base-content/90 leading-relaxed">
            It is a small change, but if you buy anything online with any regularity, it adds up quickly.
          </p>
        </div>
      </article>

      <section className="pt-2">
        <Link href="/blog" className="link link-primary">
          Back to blog
        </Link>
      </section>
    </main>
  )
}
