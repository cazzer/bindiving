import Image from 'next/image'
import Link from 'next/link'

import logo from 'public/images/bin-diving-white.svg'

const navItems = [{ linkText: 'Home', href: '/' }]

export function Header() {
  return (
    <nav className="flex flex-wrap items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
      <Link href="/">
        <Image src={logo} alt="Bin Diving Logo" width="48" />
      </Link>
    </nav>
  )
}
