import Breadcrumb from "@/components/Common/Breadcrumb";
import PolicyNav from "@/components/Policy/PolicyNav";
import { Link } from "@/i18n/routing";
import { getPolicies } from "@/services/policyService";
import { Metadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";
import { formatRichTextContent } from "@/lib/format";

export const revalidate = 120; // ISR: revalidate mỗi 2 phút

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const policiesResult = await getPolicies({ lang: locale }).catch(() => null);
  const policies = policiesResult?.data || [];

  const getTranslationData = (item: any, currentLocale: string) => {
    if (!item?.translations) return item;
    const translation = item.translations.find((t: any) => t.locale === currentLocale) ||
      item.translations.find((t: any) => t.locale.startsWith(currentLocale)) ||
      item.translations[0];
    return { ...item, ...translation };
  };

  const processedPolicies = policies.map(p => getTranslationData(p, locale));
  const currentPolicy = processedPolicies.find((p) => p.slug === slug) || processedPolicies[0];

  if (!currentPolicy) {
    return {};
  }

  const isEn = locale === 'en';
  const title = currentPolicy.title || currentPolicy.name || "";
  const description = currentPolicy.seo_description || currentPolicy.meta_description || "";

  const seoTitle = currentPolicy.seo_title || (isEn ? (title || currentPolicy.meta_title) : (currentPolicy.meta_title || title));
  const seoDescription = currentPolicy.seo_description || currentPolicy.meta_description || description;
  const seoKeywords = currentPolicy.seo_keywords || currentPolicy.meta_keywords || "";

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const customCanonical = currentPolicy.canonical_url;
  const canonicalUrl = customCanonical || `${baseUrl}/${locale}/policy/${slug}`;

  const customOgImage = currentPolicy.og_image;
  const policyImage = customOgImage || currentPolicy.image || "/cover.jpg";
  const customRobots = currentPolicy.meta_robots || undefined;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    robots: customRobots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `${baseUrl}/vi/policy/${slug}`,
        en: `${baseUrl}/en/policy/${slug}`,
      },
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      images: [policyImage],
      type: 'article' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: seoTitle,
      description: seoDescription,
      images: [policyImage],
    }
  };
}

export default async function PolicyPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params;

  const policiesResult = await getPolicies({ lang: locale });
  const policies = policiesResult.data;

  const getTranslation = (item: any, currentLocale: string) => {
    if (!item?.translations) return item;
    const translation = item.translations.find((t: any) => t.locale === currentLocale) ||
      item.translations.find((t: any) => t.locale.startsWith(currentLocale)) ||
      item.translations[0];
    return { ...item, ...translation };
  };

  const processedPolicies = policies.map(p => getTranslation(p, locale));

  const currentPolicy = processedPolicies.find((p) => p.slug === slug) || processedPolicies[0];

  if (!currentPolicy) {
    return (
      <div className="container py-20 text-center">
        <h1 className="display-4 text-primary">Không tìm thấy nội dung</h1>
      </div>
    );
  }

  const breadcrumbs = [
    { title: currentPolicy.title || currentPolicy.name }
  ];

  return (
    <main className="md:py-16 py-12 xl:pt-20 xl:pb-[112px]">
      <JsonLd
        type="Article"
        data={currentPolicy}
        url={`${(process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '')}/${locale}/policy/${slug}`}
      />
      <div className="container space-y-3">
        <Breadcrumb breadcrumbs={breadcrumbs} />

        <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8 items-start">
          <aside className="col-span-full lg:col-span-3">
            <PolicyNav
              policies={processedPolicies.map(p => ({ id: p.id, slug: p.slug, title: p.title || p.name }))}
              currentSlug={slug}
            />
          </aside>

          <article className="col-span-full lg:col-span-9">
            <div className="bg-white rounded-[24px] md:p-4 p-3 xl:p-6">
              <div className="space-y-3">
                <h1 className="display-3 text-primary">{currentPolicy.title || currentPolicy.name}</h1>
                <div
                  className="prose-content max-w-full"
                  dangerouslySetInnerHTML={{ __html: formatRichTextContent(currentPolicy.content) }}
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
