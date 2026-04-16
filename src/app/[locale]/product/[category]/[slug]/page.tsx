import Breadcrumb from "@/components/Common/Breadcrumb";
import Image from "next/image";
import ProductDetailsInfo from "@/components/Product/ProductDetailsInfo";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import { getTranslations } from "next-intl/server";
import { getProductBySlug } from "@/services/productService";
import { notFound } from "next/navigation";
import { Metadata, ResolvingMetadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; category: string; slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const product = await getProductBySlug(slug, { revalidate: 3600, lang: locale });
  if (!product) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://staging-cothaotomca.betech-digital.com';
  const canonicalUrl = `${baseUrl}/${locale}/product/${category}/${slug}`;
  const previousImages = (await parent).openGraph?.images || [];
  const productImage = product.image || previousImages[0];

  const seoTitle = (product as any).seo_title || product.name;
  const seoDescription = (product as any).seo_description || product.description?.substring(0, 160) || '';
  const seoKeywords = (product as any).seo_keywords || undefined;

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
          url: (productImage as any)?.url || productImage,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}


export default async function ProductDetailsPage({
  params
}: {
  params: Promise<{ locale: string; category: string; slug: string }>
}) {
  const { locale, slug } = await params
  const product = await getProductBySlug(slug, { revalidate: 3600, lang: locale });

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
      title: product.category?.title || "Sản phẩm",
      slug: product.category?.slug || ""
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

  const relatedProducts = product.related_products?.map((p: any) => ({
    id: p.id,
    title: p.name,
    slug: p.slug,
    price: parseInt(p.price),
    category: { title: p.category?.title, slug: p.category?.slug },
    image: { url: p.image },
    description: p.description,
    created_at: p.created_at
  })) || [];

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
