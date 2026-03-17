import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ScrollToTop from "@/components/ScrollToTop"
import "../../styles/globals.scss"
import { Providers } from "../providers"


export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html suppressHydrationWarning lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <div className="isolate">
              <Header />
              {children}
              <Footer />
              <ScrollToTop />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
