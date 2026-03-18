import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ locale: localePromise, requestLocale }) => {
  // In different versions of next-intl, the locale is provided as 'locale' or 'requestLocale'
  // and in Next.js 15+ it's a Promise.
  let locale = await (localePromise || requestLocale);
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default
  };
});