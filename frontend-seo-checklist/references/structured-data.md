# Structured Data — JSON-LD Templates

## Product Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nike Air Max 2026",
  "description": "Premium running shoes with Air cushioning technology.",
  "image": ["https://example.com/nike-airmax-front.jpg", "https://example.com/nike-airmax-side.jpg"],
  "brand": { "@type": "Brand", "name": "Nike" },
  "sku": "AIRMAX-2026-BLK",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/nike-airmax-2026",
    "price": "2500000",
    "priceCurrency": "VND",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "Your Store" }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "234"
  }
}
```

---

## Breadcrumb Schema

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Giày", "item": "https://example.com/giay" },
    { "@type": "ListItem", "position": 3, "name": "Nike Air Max 2026", "item": "https://example.com/giay/nike-airmax-2026" }
  ]
}
```

---

## Article Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Cách chọn giày chạy bộ phù hợp",
  "description": "Hướng dẫn chi tiết giúp bạn chọn đôi giày chạy bộ phù hợp nhất.",
  "image": "https://example.com/blog/giay-chay-bo.jpg",
  "author": { "@type": "Person", "name": "Nguyễn Văn A" },
  "publisher": {
    "@type": "Organization",
    "name": "Your Brand",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  },
  "datePublished": "2026-01-15",
  "dateModified": "2026-03-01"
}
```

---

## FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Nike Air Max có size nào?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Nike Air Max có đầy đủ size từ 36 đến 46, bao gồm nửa size."
      }
    },
    {
      "@type": "Question",
      "name": "Bảo hành bao lâu?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Bảo hành 12 tháng lỗi nhà sản xuất."
      }
    }
  ]
}
```

---

## Organization Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+84-xxx-xxx-xxx",
    "contactType": "customer service",
    "areaServed": "VN",
    "availableLanguage": "Vietnamese"
  },
  "sameAs": [
    "https://www.facebook.com/yourpage",
    "https://www.instagram.com/yourpage"
  ]
}
```

---

## LocalBusiness Schema

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Cửa hàng giày ABC",
  "image": "https://example.com/store.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Nguyễn Huệ",
    "addressLocality": "Quận 1",
    "addressRegion": "Hồ Chí Minh",
    "postalCode": "700000",
    "addressCountry": "VN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 10.7769, "longitude": 106.7009 },
  "url": "https://example.com",
  "telephone": "+84-xxx-xxx",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "21:00"
    }
  ]
}
```

---

## Next.js — Inject JSON-LD

```tsx
// app/products/[slug]/page.tsx
export default function ProductPage({ product }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    // ...
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductContent product={product} />
    </>
  )
}
```

---

## Validation

- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema Markup Validator: https://validator.schema.org/
