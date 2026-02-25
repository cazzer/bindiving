import Image from 'next/image'
import Link from 'next/link'

import logo from 'public/images/bin-diving.svg'

const TAGLINE =
  "There is a lot to dig through on Amazon. Describe what you're looking for and we'll use some AI magic to find a few recommendations."

export function Header() {
  return (
    <header className="flex flex-col items-center text-center pt-12 pb-8 sm:pt-16 sm:pb-12">
      <Link href="/" className="flex flex-col items-center gap-4">
        <Image src={logo} alt="Bin Diving" width="56" height="56" />
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">Bin Diving</h1>
      </Link>
      <p className="mt-4 max-w-xl text-sm text-neutral-600 sm:text-base">
        {TAGLINE}
      </p>
    </header>
  )
}
