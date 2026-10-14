import { getTranslations, getLocale } from 'next-intl/server'
import { locales as supportedLocales, defaultLocale } from '@/i18n/config'
import { Link } from '@/i18n/i18n-navigation'
import { headers } from 'next/headers'

export default async function NotFound({ params }: { params?: Promise<{ locale?: string }> | { locale?: string } }) {
  let detectedLocale: string | undefined;
  try {
    detectedLocale = await getLocale();
  } catch {
    // ignore
  }

  if (!detectedLocale || detectedLocale === defaultLocale) {
    try {
      const resolvedParams = params ? await params : undefined;
      if (resolvedParams?.locale) {
        detectedLocale = resolvedParams.locale;
      } else {
        const hdrs = await headers();
        const pathname = hdrs.get('x-pathname') || hdrs.get('x-invoke-path') || hdrs.get('x-matched-path') || hdrs.get('referer') || '';
        if (/(\/|^)en(\/|$)/.test(pathname)) {
          detectedLocale = 'en';
        }
      }
    } catch {
      // ignore
    }
  }

  const locale = detectedLocale || defaultLocale;
  const useLocale = supportedLocales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: useLocale });

  return (
    <main className="min-h-[720px] flex items-center justify-center bg-yellow p-6">
      <div className="container">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-6xl font-extrabold text-primary mb-4">{t('errors.404.title')}</h1>
          <p className="text-xl text-gray-700 mb-6">{t('errors.404.description')}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-secondary text-white font-bold rounded-full hover:bg-secondary/90 transition-all"
          >
            {t('errors.404.go_home')}
          </Link>
        </div>
      </div>
    </main>
  )
}
