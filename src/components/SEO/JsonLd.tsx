import React from 'react';

type JsonLdProps = {
  type: 'Product' | 'Article' | 'Organization' | 'BreadcrumbList';
  data: any;
  url?: string;
};

export default function JsonLd({ type, data, url }: JsonLdProps) {
  let schemaBase: any = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'Product':
      schemaBase = {
        ...schemaBase,
        name: data.name,
        image: data.images ? data.images.map((img: any) => img.image) : [data.image],
        description: data.description || data.shortDescription,
        sku: data.id?.toString(),
        offers: {
          '@type': 'Offer',
          url: url,
          priceCurrency: 'VND',
          price: data.price,
          itemCondition: 'https://schema.org/NewCondition',
          availability: 'https://schema.org/InStock',
        },
      };
      break;

    case 'Article':
      schemaBase = {
        ...schemaBase,
        headline: data.title,
        image: data.thumbnail ? [data.thumbnail] : [],
        datePublished: data.created_at,
        dateModified: data.created_at,
        author: {
          '@type': 'Organization',
          name: 'Co Thao Tom Ca',
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
        name: data.siteName,
        url: data.url,
        logo: data.logoUrl,
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: data.hotline,
          contactType: 'customer service',
        },
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
