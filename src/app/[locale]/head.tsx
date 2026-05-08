import { getSeoSettings } from '@/services/seoService'
import { defaultLocale } from '@/i18n/config'

export default async function Head({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const useLocale = locale || defaultLocale

  let seo = null
  try {
    seo = await getSeoSettings(useLocale)
  } catch (e) {
    seo = null
  }

  const gaId = seo?.google_analytics_id || seo?.googleAnalyticsId
  const gtmId = seo?.google_tag_manager_id || seo?.googleTagManagerId
  const fbId = seo?.facebook_pixel_id || seo?.facebookPixelId
  const headScripts = seo?.head_scripts || seo?.headScripts

  return (
    <>
      {/* Google Analytics (gtag.js) */}
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');` }} />
        </>
      )}

      {/* Google Tag Manager (head part) */}
      {gtmId && (
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');` }} />
      )}

      {/* Facebook Pixel */}
      {fbId && (
        <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${fbId}'); fbq('track', 'PageView');` }} />
      )}

      {/* Raw head scripts from CMS */}
      {headScripts && <script dangerouslySetInnerHTML={{ __html: headScripts }} />}
    </>
  )
}
