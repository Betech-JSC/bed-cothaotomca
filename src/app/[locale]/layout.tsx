import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import Header from "@/components/Header"
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

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com'

  // Chuẩn SEO Google 150-160 ký tự
  const seoTitle = 'Cô Thảo Tôm Cá | Chuyên cung cấp Đặc Sản Tôm Cá, Hải Sản Tươi Ngon'
  const seoDescription = 'Cô Thảo Tôm Cá tự hào mang đến các sản phẩm thủy hải sản, tôm cá tươi sạch, chất lượng cao. Nguồn gốc rõ ràng, vệ sinh an toàn thực phẩm, giao hàng tận nơi.'
  const coverImage = '/cover.jpg'

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | Cô Thảo Tôm Cá`,
      default: seoTitle,
    },
    description: seoDescription,
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
      <body>
        <JsonLd
          type="Organization"
          data={{
            siteName: 'Cô Thảo Tôm Cá',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com',
            hotline: settings?.hotline || '',
          }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GeneralSettingsProvider settings={settings}>
            <BranchProvider branches={branches}>
              <Providers>
                <div className="isolate">
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
