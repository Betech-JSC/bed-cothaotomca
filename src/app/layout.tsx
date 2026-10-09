import { defaultLocale } from '@/i18n/config'
import '@/styles/globals.scss'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-visual',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn'),
  verification: {
    google: 'wu7G5Y43-OJpfT_MdiJok7SiXB9rzE2Q988xapcDYQw',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} className="overflow-x-hidden max-w-full w-full">
      <body className="overflow-x-hidden max-w-full w-full">
        {/* Hardcoded Google Analytics Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DWYQVDL3BZ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DWYQVDL3BZ');
          `}
        </Script>
        {children}
      </body>
    </html>
  )
}
