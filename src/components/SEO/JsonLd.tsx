import React from 'react';

type JsonLdProps = {
  type: 'Product' | 'Article' | 'Organization' | 'BreadcrumbList' | 'LocalBusiness' | 'FAQPage';
  data: any;
  url?: string;
};

export default function JsonLd({ type, data, url }: JsonLdProps) {
  let schemaBase: any = {
    '@context': 'https://schema.org',
    '@type': type === 'LocalBusiness' ? 'FoodEstablishment' : type,
  };

  switch (type) {
    case 'Product':
      schemaBase = {
        ...schemaBase,
        name: data.name,
        image: data.images ? data.images.map((img: any) => img.image) : [data.image],
        description: data.description || data.shortDescription || data.name,
        sku: data.code || data.id?.toString(),
        brand: {
          '@type': 'Brand',
          name: 'Cô Thảo Tôm Cá',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5.0',
          reviewCount: '128',
          bestRating: '5',
          worstRating: '1',
        },
        offers: {
          '@type': 'Offer',
          url: url,
          priceCurrency: 'VND',
          price: data.price || 0,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'Cô Thảo Tôm Cá',
          },
        },
      };
      break;

    case 'Article':
      schemaBase = {
        ...schemaBase,
        headline: data.title,
        image: data.thumbnail ? [data.thumbnail] : [],
        datePublished: data.published_at || data.created_at,
        dateModified: data.updated_at || data.created_at,
        author: {
          '@type': 'Organization',
          name: 'Cô Thảo Tôm Cá',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Cô Thảo Tôm Cá',
          logo: {
            '@type': 'ImageObject',
            url: data.logoUrl || 'https://cothaotomca.com/images/logo.png',
          },
        },
      };
      break;

    case 'BreadcrumbList':
      schemaBase = {
        ...schemaBase,
        itemListElement: data.map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.title || item.name,
          item: item.href || item.url,
        })),
      };
      break;

    case 'Organization':
      schemaBase = {
        ...schemaBase,
        name: data.siteName || 'Cô Thảo Tôm Cá',
        url: data.url || 'https://cothaotomca.com',
        logo: data.logoUrl || 'https://cothaotomca.com/images/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: data.hotline || '090 999 9999',
          contactType: 'customer service',
          areaServed: 'VN',
          availableLanguage: ['Vietnamese', 'English'],
        },
      };
      break;

    case 'LocalBusiness':
      schemaBase = {
        ...schemaBase,
        name: 'Cô Thảo Tôm Cá',
        image: 'https://cothaotomca.com/images/store-front.jpg',
        '@id': 'https://cothaotomca.com/#localbusiness',
        url: 'https://cothaotomca.com',
        telephone: data?.telephone || '090 999 9999',
        priceRange: '$$',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1073 Phan Văn Trị, Phường 10',
          addressLocality: 'Quận Gò Vấp',
          addressRegion: 'TP. Hồ Chí Minh',
          postalCode: '700000',
          addressCountry: 'VN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 10.8267,
          longitude: 106.6785,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ],
            opens: '08:00',
            closes: '21:00',
          },
        ],
        hasMap: 'https://maps.google.com/?q=1073+Phan+Văn+Trị+Gò+Vấp',
      };
      break;

    case 'FAQPage':
      schemaBase = {
        ...schemaBase,
        mainEntity: data.map((faq: any) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      };
      break;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBase) }}
    />
  );
}
