import { defaultLocale } from '@/i18n/config'
import '@/styles/globals.scss'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale}>
      <head>
        {/* Hardcoded Google Analytics Tag */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DWYQVDL3BZ" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-DWYQVDL3BZ');
            `,
          }}
        />
        {/* Google Site Verification */}
        <meta name="google-site-verification" content="wu7G5Y43-OJpfT_MdiJok7SiXB9rzE2Q988xapcDYQw" />
      </head>
      <body>{children}</body>
    </html>
  )
}
