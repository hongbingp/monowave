import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/providers/Web3Provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'monowave - AI Content Platform Demo',
  description: 'Bridging Publishers, AI Apps, and Advertisers through blockchain-powered revenue distribution',
  keywords: 'AI, blockchain, content, advertising, revenue distribution',
  authors: [{ name: 'monowave Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {children}
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}
