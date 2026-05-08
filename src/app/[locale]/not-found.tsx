import { getTranslations } from 'next-intl/server'
import { locales as supportedLocales, defaultLocale } from '@/i18n/config'

export default async function NotFound({ params }: { params: { locale?: string } }) {
  const locale = params?.locale || defaultLocale;

  // Use defaultLocale when incoming locale is not supported
  const useLocale = supportedLocales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: useLocale });

  return (
    <main className="min-h-[720px] flex items-center justify-center bg-yellow p-6">
      <div className="container">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-6xl font-extrabold text-primary mb-4">{t('errors.404.title')}</h1>
          <p className="text-xl text-gray-700 mb-6">{t('errors.404.description')}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('errors.404.go_home')}
          </a>
        </div>
      </div>
    </main>
  )
}
