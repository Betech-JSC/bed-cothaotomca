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
import Script from 'next/script'

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const baseUrl = (rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`).replace(/\/$/, '');
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

              {/* Scripts from SEO Settings */}
              {seo && (
                <>
                  {/* Google Analytics (gtag.js) */}
                  {(seo.google_analytics_id || seo.googleAnalyticsId) && (
                    <>
                      <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${seo.google_analytics_id || seo.googleAnalyticsId}`}
                        strategy="afterInteractive"
                      />
                      <Script id="google-analytics" strategy="afterInteractive">
                        {`
                          window.dataLayer = window.dataLayer || [];
                          function gtag(){dataLayer.push(arguments);}
                          gtag('js', new Date());
                          gtag('config', '${seo.google_analytics_id || seo.googleAnalyticsId}');
                        `}
                      </Script>
                    </>
                  )}

                  {/* Google Tag Manager (head part) */}
                  {(seo.google_tag_manager_id || seo.googleTagManagerId) && (
                    <Script id="gtm-script" strategy="afterInteractive">
                      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.google_tag_manager_id || seo.googleTagManagerId}');`}
                    </Script>
                  )}

                  {/* Facebook Pixel */}
                  {(seo.facebook_pixel_id || seo.facebookPixelId) && (
                    <Script id="fb-pixel" strategy="afterInteractive">
                      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${seo.facebook_pixel_id || seo.facebookPixelId}'); fbq('track', 'PageView');`}
                    </Script>
                  )}

                  {/* Raw head scripts from CMS */}
                  {(seo.head_scripts || seo.headScripts) && (
                    <div dangerouslySetInnerHTML={{ __html: seo.head_scripts || seo.headScripts }} />
                  )}
                </>
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
