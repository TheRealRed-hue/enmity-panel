import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionTracker } from '@/components/session-tracker'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Enmity Exe Moderation Dashboard',
  description: 'Professional moderation dashboard for the Enmity Exe Discord server',
  keywords: ['Enmity Exe', 'Discord', 'Moderation', 'Dashboard'],
}

export const viewport: Viewport = {
  themeColor: '#0a0f1a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background`}>
        <SessionTracker />
        {children}
      </body>
    </html>
  )
}