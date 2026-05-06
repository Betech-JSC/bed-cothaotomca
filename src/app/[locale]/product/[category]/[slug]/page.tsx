import Breadcrumb from "@/components/Common/Breadcrumb";
import Image from "next/image";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import { getTranslations } from "next-intl/server";
import { getProductBySlug, Translation } from "@/services/productService";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";

import { getTranslation } from "@/lib/format";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; category: string; slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const product = await getProductBySlug(slug, { revalidate: 3600, lang: locale });
  
  console.log('--- RAW PRODUCT DATA (METADATA) ---');
  console.log(JSON.stringify(product, null, 2));
  console.log('----------------------------------');

  if (!product) return {};

  const translation = getTranslation<Translation>(product.translations, locale);
  const productName = translation?.name || product.name || "";
  const productDescription = translation?.description || product.description || "";

  // Ưu tiên lấy SEO từ bản dịch, nếu không có thì lấy SEO ở cấp root, cuối cùng mới fallback về name/description mặc định
  const seoTitle = translation?.seo_title || product.seo_title || product.meta_title || productName;
  const seoDescription = translation?.seo_description || product.seo_description || product.meta_description || productDescription;
  const seoKeywords = translation?.seo_keywords || product.seo_keywords || product.meta_keywords || "";

  console.log('[PRODUCT SEO DEBUG] Processed values:', {
    locale,
    productName,
    seoTitle,
    seoDescription,
    hasTranslation: !!translation
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';
  const canonicalUrl = `${baseUrl}/${locale}/product/${category}/${slug}`;
  const previousImages = (await parent).openGraph?.images || [];
  const productImage = product.image || (previousImages.length > 0 ? previousImages[0].url : "/cover.jpg");

  const metadata = {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
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

  console.log('[PRODUCT SEO DEBUG] FINAL METADATA OBJECT:', JSON.stringify(metadata, null, 2));
  return metadata;
}


export default async function ProductDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, category, slug } = await params
  console.log('Product Detail Page - Category:', category, 'Slug:', slug, 'Locale:', locale);
  
  const product = await getProductBySlug(slug, { revalidate: 3600, lang: locale });
  console.log('Product fetched:', product ? 'Found' : 'Not found');

  if (!product) {
    notFound();
  }

  const t = await getTranslations({ locale });

  const productData = {
    title: product.name,
    description: product.description,
    image: {
      url: product.image,
      alt: product.name,
    },
    images: product.images && product.images.length > 0
      ? product.images.map((img: any, idx: number) => ({ url: img.image, alt: `${product.name} ${idx + 1}` }))
      : [{ url: product.image, alt: product.name }],
    sizes: product.variants && product.variants.length > 0
      ? product.variants.map((v: any) => ({ title: v.size, price: v.price }))
      : [{ title: "Standard", price: parseInt(product.price) }],
    category: {
      title: (product.categories && product.categories.length > 0 ? product.categories[0]?.title : product.category?.title) || "Sản phẩm",
      slug: (product.categories && product.categories.length > 0 ? product.categories[0]?.slug : product.category?.slug) || ""
    },
    infos: product.sections?.map((section: any) => ({
      title: section.title,
      content: section.content
    })) || []

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
  console.log('Data product:', productData.images)

  const relatedProducts = product.related_products?.map((p: any) => {
    const relatedCategory = p.categories && p.categories.length > 0 ? p.categories[0] : p.category;
    return {
      id: p.id,
      title: p.name,
      slug: p.slug,
      price: parseInt(p.price),
      category: { title: relatedCategory?.title || "Sản phẩm", slug: relatedCategory?.slug || "" },
      image: { url: p.image },
      description: p.description,
      created_at: p.created_at
    };
  }) || [];

  return (
    <main>
      <JsonLd
        type="Product"
        data={product}
        url={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com'}/${locale}/product/${productData.category.slug}/${slug}`}
      />
      <section className="md:py-[56px] pt-4 pb-12 xl:py-[60px]">
        <div className="container">
          <div className="grid grid-cols-12 gap-4 md:gap-6 xl:gap-8">
            <div className="col-span-full lg:col-span-6 xl:col-span-7 lg:pr-3 xl:pr-4">
              <div className="md:block hidden space-y-6">
                {productData.images && productData.images.length > 0 ? <div className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                  <Image
                    src={productData.image?.url || '/cover.jpg'}
                    alt={productData.title || "image product"}
                    fill
                    className="object-cover w-full h-full"
                  />
                </div> : <>
                  {productData.images.map((image: any, index: number) => {
                    return (
                      <div key={index} className="relative aspect-w-1 aspect-h-1 rounded-[24px] overflow-hidden" >
                        <Image
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
