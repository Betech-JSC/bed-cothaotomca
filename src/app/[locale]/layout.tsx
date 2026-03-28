import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Header from "@/components/Header"
import NavigationProgress from "@/components/NavigationProgress"
import Footer from "@/components/Footer"
import ScrollToTop from "@/components/ScrollToTop"
import "../../styles/globals.scss"
import { Providers } from "../providers"
import { getGeneralSettings } from '@/services/generalSettingService'
import { GeneralSettingsProvider } from '@/contexts/GeneralSettingsContext'
import { getBranches } from '@/services/branchService'
import { BranchProvider } from '@/contexts/BranchContext'
import { Metadata } from 'next'
import JsonLd from '@/components/SEO/JsonLd'
import TrackingScripts from '@/components/SEO/TrackingScripts'
import { getSeoSettings } from '@/services/seoSettingService'

const FALLBACK_SEO = {
  title: 'Cô Thảo Tôm Cá | Chuyên cung cấp Đặc Sản Tôm Cá, Hải Sản Tươi Ngon',
  description: 'Cô Thảo Tôm Cá tự hào mang đến các sản phẩm thủy hải sản, tôm cá tươi sạch, chất lượng cao. Nguồn gốc rõ ràng, vệ sinh an toàn thực phẩm, giao hàng tận nơi.',
  coverImage: '/cover.jpg',
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com'

  // Lấy SEO từ API, fallback về giá trị mặc định nếu không có
  const seo = await getSeoSettings().catch(() => null)

  const seoTitle = seo?.seo_title || FALLBACK_SEO.title
  const seoDescription = seo?.seo_description || FALLBACK_SEO.description
  const coverImage = seo?.seo_og_image || FALLBACK_SEO.coverImage
  const seoKeywords = seo?.seo_keywords || undefined

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | Cô Thảo Tôm Cá`,
      default: seoTitle,
    },
    description: seoDescription,
    keywords: seoKeywords,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: 'website',
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      url: `${baseUrl}/${locale}`,
      siteName: 'Cô Thảo Tôm Cá',
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: 'Cô Thảo Tôm Cá Cover',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [coverImage],
    },
  }
}

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
  const branches = await getBranches().catch(() => []);

  return (
    <html suppressHydrationWarning lang={locale}>
      <head>
        <TrackingScripts />
      </head>
      <body>
        <JsonLd
          type="Organization"
          data={{
            siteName: 'Cô Thảo Tôm Cá',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com',
            logoUrl: settings?.logo_url || '',
            hotline: settings?.hotline || '',
          }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GeneralSettingsProvider settings={settings}>
            <BranchProvider branches={branches}>
              <Providers>
                <div className="isolate">
                  <NavigationProgress />
                  <Header />
                  {children}
                  <Footer />
                  <ScrollToTop />
                </div>
              </Providers>
            </BranchProvider>
          </GeneralSettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
