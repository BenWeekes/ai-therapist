import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Agora AI Therapist",
  description: "Video avatar AI therapist powered by TEN Framework",
  openGraph: {
    title: "Agora AI Therapist",
    description: "Video avatar AI therapist powered by TEN Framework",
    siteName: "Agora AI Therapist",
    type: "website",
    url: "https://ten-demo.agora.io/ai-therapist",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
