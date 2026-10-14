import { defaultLocale, locales as supportedLocales } from '@/i18n/config'
import '@/styles/globals.scss'
import type { Metadata, Viewport } from 'next'
import { getLocale } from 'next-intl/server'

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let locale: string = defaultLocale;
  try {
    const detected = await getLocale();
    if (detected && supportedLocales.includes(detected as any)) {
      locale = detected;
    }
  } catch {
    locale = defaultLocale;
  }

  return (
    <html lang={locale} className="overflow-x-hidden max-w-full w-full">
      <body className="overflow-x-hidden max-w-full w-full">
        {children}
      </body>
    </html>
  )
}
