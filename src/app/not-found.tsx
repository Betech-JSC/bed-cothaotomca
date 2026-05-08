import { getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { getGeneralSettings } from '@/services/generalSettingService'
import { getBranches } from '@/services/branchService'
import { GeneralSettingsProvider } from '@/contexts/GeneralSettingsContext'
import { BranchProvider } from '@/contexts/BranchContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FixedSocial from '@/components/FixedSocial'
import { Providers } from './providers'
import { defaultLocale } from '@/i18n/config'

export default async function GlobalNotFound() {
  const locale = defaultLocale;
  const t = await getTranslations({ locale });

  // Fetch settings/branches to provide to header/footer like other layouts
  const settings = await getGeneralSettings(locale).catch(() => null);
  const branches = await getBranches(locale).catch(() => []);

  // Load messages for NextIntlClientProvider
  const messages = (await import(`../i18n/locales/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GeneralSettingsProvider settings={settings}>
            <BranchProvider branches={branches}>
              <Providers>
                <div className="isolate">
                  <Header />
                  <main className="min-h-[500px] md:min-h-[720px] flex items-center justify-center bg-yellow p-6">
                    <div className="container">
                      <div className="max-w-xl mx-auto text-center">
                        <h1 className="display-1 font-bold text-primary mb-4">{t('errors.404.title')}</h1>
                        <p className="title-1 text-gray-700 mb-6">{t('errors.404.description')}</p>
                        <a
                          href={`/${locale}`}
                          className="btn btn-primary w-[150px] mx-auto"
                        >
                          {t('errors.404.go_home')}
                        </a>
                      </div>
                    </div>
                  </main>
                  <Footer />
                  <FixedSocial />
                </div>
              </Providers>
            </BranchProvider>
          </GeneralSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
