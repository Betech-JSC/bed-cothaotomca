import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Providers } from "../providers"
import { getGeneralSettings } from '@/services/generalSettingService'
import { GeneralSettingsProvider } from '@/contexts/GeneralSettingsContext'
import { getBranches } from '@/services/branchService'
import { BranchProvider } from '@/contexts/BranchContext'
import { Metadata } from 'next'
import JsonLd from '@/components/SEO/JsonLd'
import FixedSocial from '@/components/FixedSocial'
import { getSeoSettings } from '@/services/seoService'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com'
  // Defaults
  const defaultTitle = 'Cô Thảo Tôm Cá | Chuyên cung cấp Đặc Sản Tôm Cá, Hải Sản Tươi Ngon'
  const defaultDescription = 'Cô Thảo Tôm Cá tự hào mang đến các sản phẩm thủy hải sản, tôm cá tươi sạch, chất lượng cao. Nguồn gốc rõ ràng, vệ sinh an toàn thực phẩm, giao hàng tận nơi.'
  const defaultImage = '/cover.jpg'

  // Try to load SEO settings from API and fallback to defaults
  let seo: any = null
  try {
    seo = await getSeoSettings(locale).catch(() => null)
  } catch (e) {
    seo = null
  }

  const title = seo?.title || defaultTitle
  const description = seo?.description || defaultDescription
  let image = seo?.meta_image || seo?.metaImage || seo?.meta_image_url || defaultImage
  // Make image absolute when necessary
  if (image && !image.startsWith('http')) image = `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`

  const favicon = seo?.favicon || seo?.favicon_url || '/favicon.ico'
  const keywords = seo?.keywords ? seo.keywords.split(',').map((k: string) => k.trim()) : undefined

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | Cô Thảo Tôm Cá`,
      default: title,
    },
    description,
    keywords,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      url: `${baseUrl}/${locale}`,
      siteName: 'Cô Thảo Tôm Cá',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const messages = await getMessages()

  const settings = await getGeneralSettings(locale).catch(() => null);
  const branches = await getBranches(locale).catch(() => []);
  // load seo settings to expose body scripts / GTM noscript per-locale
  let seo = null
  try {
    const { getSeoSettings } = await import('@/services/seoService')
    seo = await getSeoSettings(locale).catch(() => null)
  } catch (e) {
    seo = null
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <GeneralSettingsProvider settings={settings}>
        <BranchProvider branches={branches}>
          <Providers>
            <div className="isolate">
              {/* Google Tag Manager (noscript) - should appear immediately after body open */}
              {seo?.google_tag_manager_id && (
                <noscript>
                  <iframe src={`https://www.googletagmanager.com/ns.html?id=${seo.google_tag_manager_id}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
                </noscript>
              )}

              <Header />
              {children}

              {/* Body scripts from CMS - place before footer */}
              {seo?.body_scripts && (
                // eslint-disable-next-line react/no-danger
                <div dangerouslySetInnerHTML={{ __html: seo.body_scripts }} />
              )}

              <Footer />
              <FixedSocial />
            </div>
          </Providers>
        </BranchProvider>
      </GeneralSettingsProvider>
    </NextIntlClientProvider>
  )
}
