import { Geist, Geist_Mono } from "next/font/google"
import type { Metadata } from "next"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "AIO-Chat - Enterprise AI Platform",
  description: "Advanced AI-powered customer support with anti-chonk security",
  keywords: ["AI", "chat", "customer support", "anti-chonk", "tuna protection"],
  authors: [{ name: "AIO-Chat Security Team" }],
  robots: "noindex, nofollow",
  other: {
    "X-Chonk-Defense": "ACTIVE",
    "X-Tuna-Protection": "ENABLED",
    "X-Orange-Threat-Level": "MONITORED"
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
