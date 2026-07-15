import Breadcrumb from "@/components/Common/Breadcrumb";
import Image from "next/image";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import ZoomableImage from "@/components/Common/ZoomableImage";
import { getTranslations } from "next-intl/server";
import { Translation } from "@/services/productService";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";

import { getTranslation, slugify } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; category: string; slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const { getProductBySlugWithFallback } = await import('@/services/productService');
  const product = await getProductBySlugWithFallback(slug, { revalidate: 0, lang: locale });

  if (!product) return {};

  const translation = getTranslation<Translation>(product.translations, locale);
  const productName = translation?.name || product.name || "";
  const productDescription = translation?.description || product.description || "";

  // Ưu tiên lấy SEO từ bản dịch, nếu không có thì lấy SEO ở cấp root, cuối cùng mới fallback về name/description mặc định
  const seoTitle = translation?.seo_title || product.seo_title || product.meta_title || productName;
  const seoDescription = translation?.seo_description || product.seo_description || product.meta_description || productDescription;
  const seoKeywords = translation?.seo_keywords || product.seo_keywords || product.meta_keywords || "";

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com').replace(/\/$/, '');
  const customCanonical = translation?.canonical_url || product.canonical_url;
  const canonicalUrl = customCanonical || `${baseUrl}/${locale}/product/${category}/${slug}`;
  const customOgImage = translation?.og_image || product.og_image;
  const previousImages = (await parent).openGraph?.images || [];
  const productImage = customOgImage || product.image || (previousImages.length > 0 ? (typeof previousImages[0] === 'string' ? previousImages[0] : (previousImages[0] as any).url) : "/cover.jpg");
  const customRobots = translation?.meta_robots || product.meta_robots || undefined;

  const metadata = {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    robots: customRobots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `${baseUrl}/vi/product/${category}/${slug}`,
        en: `${baseUrl}/en/product/${category}/${slug}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      images: [
        {
          url: (productImage as any)?.url || productImage,
          width: 800,
          height: 600,
          alt: productName,
        },
      ],
      type: 'article' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: seoTitle,
      description: seoDescription,
      images: [(productImage as any)?.url || productImage],
    },
  };

  return metadata;
}


export default async function ProductDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, category, slug } = await params

  const { getProductBySlugWithFallback } = await import('@/services/productService');
  const product = await getProductBySlugWithFallback(slug, { revalidate: 0, lang: locale });

  if (!product) {
    notFound();
  }

  const t = await getTranslations({ locale });

  const productData = {
    title: product.name,
    description: product.description,
    variant_type: product.variant_type,
    image: {
      url: product.image,
      alt: product.name,
    },
    images: product.images && product.images.length > 0
      ? product.images.map((img: any, idx: number) => ({ url: img.image, alt: img.alt_text || img.title || img.caption || `${product.name} ${idx + 1}` }))
      : [{ url: product.image, alt: product.name }],
    sizes: product.variants && product.variants.length > 0
      ? product.variants.map((v: any) => ({
        title: locale === "vi" ? v.size : (v.size_en || v.size),
        price: v.price,
      }))
      : [{ title: t("product.standard"), price: parseInt(product.price) }],
    category: {
      title: (product.categories && product.categories.length > 0 ? product.categories[0]?.title : product.category?.title) || "Sản phẩm",
      slug: (product.categories && product.categories.length > 0 ? product.categories[0]?.slug : product.category?.slug) || ""
    },
    infos: product.sections?.map((section: any) => ({
      title: section.title,
      content: section.content
    })) || [],
    checkout: {
      productId: product.id,
      productCode: product.code || "",
      slug: product.slug || slug,
      categorySlug: (product.categories && product.categories.length > 0 ? product.categories[0]?.slug : product.category?.slug) || category || "",
    }
  };

  const breadcrumbs = [
    {
      title: t('breadcrumb.product'),
      href: "/product",
    },
    ...(productData.category.slug ? [{
      title: productData.category.title,
      href: `/product/${productData.category.slug}`,
    }] : []),
    {
      title: productData.title,
    },
  ];

  const relatedProducts = product.related_products?.map((p: any) => {
    const translation = getTranslation(p.translations, locale) as any;
    const name = translation?.name || p.name;
    const relatedCategory = p.categories && p.categories.length > 0 ? p.categories[0] : p.category;
    const catTranslation = getTranslation(relatedCategory?.translations, locale) as any;
    const categoryName = catTranslation?.title || relatedCategory?.title || "Sản phẩm";

    const productSlug = p.slug || slugify(name);
    const categorySlug = relatedCategory?.slug || slugify(categoryName);

    return {
      id: p.id,
      title: name,
      slug: productSlug,
      price: parseInt(p.price),
      category: { title: categoryName, slug: categorySlug },
      image: { url: p.image },
      description: translation?.description || p.description,
      created_at: p.created_at
    };
  }) || [];

  return (
    <main>
      <JsonLd
        type="Product"
        data={product}
        url={`${(process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com').replace(/\/$/, '')}/${locale}/product/${productData.category.slug}/${slug}`}
      />
      <section className="md:py-[56px] pt-4 pb-12 xl:py-[60px]">
        <div className="container">
          <div className="grid grid-cols-12 gap-4 md:gap-6 xl:gap-8">
            <div className="col-span-full lg:col-span-6 xl:col-span-7 lg:pr-3 xl:pr-4">
              <div className="md:block hidden space-y-6 md:sticky md:top-28">
                {productData.images && productData.images.length > 0 ? <div className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                  <ZoomableImage
                    src={productData.image?.url || '/cover.jpg'}
                    alt={productData.title || "image product"}
                    fill
                    className="object-cover w-full h-full"
                  />
                </div> : <>
                  {productData.images.map((image: any, index: number) => {
                    return (
                      <div key={index} className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                        <ZoomableImage
                          src={image.url}
                          alt={image.alt || image.title || "image product"}
                          fill
                          className="object-cover w-full h-full"
                        />
                      </div>
                    );
                  })}
                </>}
              </div>
            </div>
            <div className="col-span-full lg:col-span-6 xl:col-span-5">
              <div className="space-y-3 flex flex-col items-start mb-3 md:mb-8 xl:mb-12">
                <Breadcrumb breadcrumbs={breadcrumbs} />
              </div>
              <ProductDetailsInfo productData={productData} />
            </div>
          </div>
        </div>
      </section>
      {relatedProducts.length > 0 && <SliderProductRelated products={relatedProducts} />}
    </main>
  )
}
