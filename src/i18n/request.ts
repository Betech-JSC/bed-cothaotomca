import { getRequestConfig } from 'next-intl/server'
import { locales, defaultLocale, type Locale } from './config'

export default getRequestConfig(async ({ locale }) => {
  let finalLocale = locale as Locale | undefined

  if (!finalLocale || !locales.includes(finalLocale)) {
    finalLocale = defaultLocale
  }

  return {
    locale: finalLocale,
    messages: (await import(`./locales/${finalLocale}.json`)).default
  }
})