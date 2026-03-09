'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavBar() {
  const pathname = usePathname()

  const linkClass = (path: string) =>
    pathname === path
      ? 'text-sm font-semibold text-[var(--accent)] border-b-2 border-[var(--accent)] pb-0.5'
      : 'text-sm font-medium text-gray-500 hover:text-[var(--text-primary)] transition-colors'

  return (
    <nav
      className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-3 bg-white border-b border-[var(--border)] sticky top-0 z-10 overflow-x-auto whitespace-nowrap"
      style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
    >
      <span className="text-sm font-bold tracking-widest text-[var(--text-primary)] mr-2 flex-shrink-0">
        21 CLOUD
      </span>
      <span className="text-gray-300 select-none flex-shrink-0">|</span>
      <Link href="/" className={linkClass('/')}>Market</Link>
      <Link href="/sectors" className={linkClass('/sectors')}>Sectors</Link>
      <Link href="/signals" className={linkClass('/signals')}>Signals</Link>
      <Link href="/guide" className={linkClass('/guide')}>Guide</Link>
      <Link href="/watchlist" className={linkClass('/watchlist')}>Watchlist</Link>
      <Link href="/portfolio" className={linkClass('/portfolio')}>Portfolio</Link>
    </nav>
  )
}
