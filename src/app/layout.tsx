import { defaultLocale } from '@/i18n/config'
import '@/styles/globals.scss'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale}>
      <body>{children}</body>
    </html>
  )
}
