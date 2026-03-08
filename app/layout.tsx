import type { Metadata } from 'next'
import { IBM_Plex_Mono, Sora, Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-jp',
})

export const metadata: Metadata = {
  title: '21 Cloud — Market Dashboard',
  description: '日本株マーケットコンディション',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${ibmPlexMono.variable} ${sora.variable} ${notoSansJP.variable}`}>
      <body className="antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  )
}
