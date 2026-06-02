import Breadcrumb from "@/components/Common/Breadcrumb";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import SliderProductImages from "@/components/Product/SliderProductImages";
import { getTranslations } from "next-intl/server";
import { Translation } from "@/services/productService";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";
import { getTranslation } from "@/lib/format";
import {
  getProductBySlugWithFallback,
  mapProductToDetailView,
} from "@/services/productService";

export async function generateMetadata(
  {
    params,
  }: { params: Promise<{ locale: string; category: string; slug: string }> },
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const product = await getProductBySlugWithFallback(slug, {
    revalidate: 3600,
    lang: locale,
  });

  if (!product) return {};

  const translation = getTranslation<Translation>(product.translations, locale);
  const productName = translation?.name || product.name || "";
  const productDescription =
    translation?.description || product.description || "";

  const seoTitle =
    translation?.seo_title ||
    product.seo_title ||
    product.meta_title ||
    productName;
  const seoDescription =
    translation?.seo_description ||
    product.seo_description ||
    product.meta_description ||
    productDescription;
  const seoKeywords =
    translation?.seo_keywords ||
    product.seo_keywords ||
    product.meta_keywords ||
    "";

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://staging-cothaotomca.betech-digital.com"
  ).replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/${locale}/product/${category}/${slug}`;
  const previousImages = (await parent).openGraph?.images || [];
  const firstImage =
    product.images?.[0]?.image ||
    product.image ||
    (previousImages.length > 0
      ? typeof previousImages[0] === "string"
        ? previousImages[0]
        : (previousImages[0] as { url?: string }).url
      : "/cover.jpg");

  return {
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
          url: firstImage,
          width: 800,
          height: 600,
          alt: productName,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [firstImage],
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale, category, slug } = await params;

  const product = await getProductBySlugWithFallback(slug, {
    revalidate: 3600,
    lang: locale,
  });

  if (!product) {
    notFound();
  }

  const t = await getTranslations({ locale });
  const productData = mapProductToDetailView(product, locale, {
    standard: t("product.standard"),
  });

  const breadcrumbs = [
    {
      title: t("breadcrumb.product"),
      href: "/product",
    },
    ...(productData.category.slug
      ? [
          {
            title: productData.category.title,
            href: `/product/${productData.category.slug}`,
          },
        ]
      : []),
    {
      title: productData.title,
    },
  ];

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://staging-cothaotomca.betech-digital.com"
  ).replace(/\/$/, "");

  return (
    <main>
      <JsonLd
        type="Product"
        data={product}
        url={`${baseUrl}/${locale}/product/${productData.category.slug}/${slug}`}
      />
      <section className="md:py-[56px] pt-4 pb-12 xl:py-[60px]">
        <div className="container">
          <div className="grid grid-cols-12 gap-4 md:gap-6 xl:gap-8">
            <div className="col-span-full lg:col-span-6 xl:col-span-7 lg:pr-3 xl:pr-4">
              <div className="md:block hidden space-y-6 md:sticky md:top-28">
                <SliderProductImages items={productData.images} />
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
      {/* related_products: BE KiotViet chưa có — ẩn block */}
    </main>
  );
}
