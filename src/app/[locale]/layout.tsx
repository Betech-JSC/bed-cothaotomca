import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ScrollToTop from "@/components/ScrollToTop"
import "../../styles/globals.scss"
import { Providers } from "../providers"
import { getGeneralSettings } from '@/services/generalSettingService'
import { GeneralSettingsProvider } from '@/contexts/GeneralSettingsContext'



export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  const settings = await getGeneralSettings().catch(() => null);

  return (
    <html suppressHydrationWarning lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GeneralSettingsProvider settings={settings}>
            <Providers>
              <div className="isolate">
                <Header />
                {children}
                <Footer />
                <ScrollToTop />
              </div>
            </Providers>
          </GeneralSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
