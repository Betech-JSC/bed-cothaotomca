import React from 'react';
import { getSeoScripts } from '@/services/seoSettingService';

/**
 * Server Component that injects tracking scripts from CMS.
 * Renders GA4, GTM, Facebook Pixel, and custom head/body scripts.
 * Safe: returns nothing if API fails or returns empty values.
 */
export default async function TrackingScripts() {
  const scripts = await getSeoScripts();

  if (!scripts) return null;

  const {
    google_analytics_id,
    google_tag_manager_id,
    facebook_pixel_id,
    head_scripts,
    body_scripts,
  } = scripts;

  return (
    <>
      {/* Google Tag Manager */}
      {google_tag_manager_id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${google_tag_manager_id}');`,
          }}
        />
      )}

      {google_analytics_id && !google_tag_manager_id && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${google_analytics_id}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${google_analytics_id}');`,
            }}
          />
        </>
      )}

      {/* Facebook Pixel */}
      {facebook_pixel_id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${facebook_pixel_id}');
fbq('track', 'PageView');`,
          }}
        />
      )}

      {head_scripts && (
        <script dangerouslySetInnerHTML={{ __html: head_scripts }} />
      )}

      {body_scripts && (
        <div dangerouslySetInnerHTML={{ __html: body_scripts }} />
      )}
    </>
  );
}
