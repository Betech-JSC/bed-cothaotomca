import Breadcrumb from "@/components/Common/Breadcrumb";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import ProductGallery from "@/components/Product/ProductGallery";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import { getTranslations } from "next-intl/server";
import { Translation } from "@/services/productService";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";

import { getTranslation, slugify } from "@/lib/format";
export const dynamic = 'force-dynamic';


export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; category: string; slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const { getProductBySlugWithFallback } = await import('@/services/productService');
  const product = await getProductBySlugWithFallback(slug, { revalidate: 60, lang: locale });


  if (!product) return {};

  const translation = getTranslation<Translation>(product.translations, locale);
  const productName = translation?.custom_name || product.custom_name || translation?.name || product.name || "";

  const productDescription = translation?.description || product.description || "";

  // Ưu tiên lấy SEO từ bản dịch, nếu không có thì lấy SEO ở cấp root, cuối cùng mới fallback về name/description mặc định
  const seoTitle = translation?.seo_title || product.seo_title || product.meta_title || productName;
  const seoDescription = translation?.seo_description || product.seo_description || product.meta_description || productDescription;
  const seoKeywords = translation?.seo_keywords || product.seo_keywords || product.meta_keywords || "";

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
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

  const translation = getTranslation<Translation>(product.translations, locale);
  const productName = translation?.custom_name || product.custom_name || translation?.name || product.name || "";

  // Thu thập danh sách ảnh (bao gồm ảnh đại diện và ảnh gallery con)
  const galleryImages: { url: string; alt: string }[] = [];
  if (product.image) {
    galleryImages.push({ url: product.image, alt: productName });
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img: any, idx: number) => {
      const imgUrl = img.image || img.url;
      if (imgUrl && !galleryImages.some((i) => i.url === imgUrl)) {
        galleryImages.push({
          url: imgUrl,
          alt: img.alt_text || img.title || img.caption || `${productName} ${idx + 1}`,
        });
      }
    });
  } else if (product.gallery && product.gallery.length > 0) {
    product.gallery.forEach((imgUrl: string, idx: number) => {
      if (imgUrl && !galleryImages.some((i) => i.url === imgUrl)) {
        galleryImages.push({
          url: imgUrl,
          alt: `${productName} ${idx + 1}`,
        });
      }
    });
  }

  if (galleryImages.length === 0) {
    galleryImages.push({ url: product.image || "/cover.jpg", alt: productName });
  }

  const productData = {
    title: productName,
    description: product.description,
    variant_type: product.variant_type,
    image: {
      url: product.image || galleryImages[0]?.url || "/cover.jpg",
      alt: product.name,
    },
    images: galleryImages,
    sizes: product.variants && product.variants.length > 0
      ? product.variants.map((v: any) => {
        const basePrice = typeof v.price === "number" ? v.price : parseFloat(v.price) || 0;
        const campaignPrice = v.campaign_price ? parseFloat(String(v.campaign_price)) : (product.campaign_price ? parseFloat(String(product.campaign_price)) : null);
        const finalPrice = campaignPrice && campaignPrice < basePrice ? campaignPrice : basePrice;
        return {
          id: v.id,
          code: v.code || "",
          title: locale === "vi" ? v.size : (v.size_en || v.size),
          price: finalPrice,
          original_price: campaignPrice && campaignPrice < basePrice ? basePrice : undefined,
        };
      })
      : [{
        id: product.id,
        code: product.code || "",
        title: t("product.standard"),
        price: product.campaign_price && parseFloat(String(product.campaign_price)) < parseFloat(product.price) ? parseFloat(String(product.campaign_price)) : parseInt(product.price),
        original_price: product.campaign_price && parseFloat(String(product.campaign_price)) < parseFloat(product.price) ? parseInt(product.price) : undefined,
      }],


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
    const name = translation?.custom_name || p.custom_name || translation?.name || p.name;

    const relatedCategory = p.categories && p.categories.length > 0 ? p.categories[0] : p.category;
    const catTranslation = getTranslation(relatedCategory?.translations, locale) as any;
    const categoryName = catTranslation?.title || relatedCategory?.title || "Sản phẩm";

    const productSlug = p.slug || slugify(name);
    const categorySlug = relatedCategory?.slug || slugify(categoryName);

    return {
      id: p.id,
      title: name,
      custom_name: p.custom_name,
      slug: productSlug,
      price: parseFloat(String(p.price || 0)),
      variants: p.variants,

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
        url={`${(process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')}/${locale}/product/${productData.category.slug}/${slug}`}

      />
      <section className="md:py-[56px] pt-4 pb-12 xl:py-[60px]">
        <div className="container">
          {/* Breadcrumb trên Mobile */}
          <div className="space-y-3 flex flex-col items-start mb-4 md:mb-6 lg:hidden">
            <Breadcrumb breadcrumbs={breadcrumbs} />
          </div>

          <div className="grid grid-cols-12 gap-6 lg:gap-8 xl:gap-12">
            {/* Cột Trái: Thư viện ảnh sản phẩm */}
            <div className="col-span-full lg:col-span-6 xl:col-span-7">
              <div className="space-y-6 lg:sticky lg:top-28">
                <ProductGallery images={productData.images} title={productData.title} />
              </div>
            </div>

            {/* Cột Phải: Thông tin chi tiết sản phẩm */}
            <div className="col-span-full lg:col-span-6 xl:col-span-5">
              <div className="space-y-3 hidden lg:flex flex-col items-start mb-4 md:mb-6 xl:mb-8">
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
