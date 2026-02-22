import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Puzzle Game — Decode the Password',
  description: 'A real-time multiplayer puzzle game. Compete with your team to decode the master password letter by letter.',
  keywords: ['puzzle', 'game', 'multiplayer', 'real-time', 'team'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
