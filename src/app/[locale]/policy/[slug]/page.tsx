import Breadcrumb from "@/components/Common/Breadcrumb";
import PolicyNav from "@/components/Policy/PolicyNav";
import { getPolicies } from "@/services/policyService";
import { Metadata } from "next";
import JsonLd from "@/components/SEO/JsonLd";
import AlternateLinksUpdater from "@/components/SEO/AlternateLinksUpdater";
import {
  formatRichTextContent,
  hasVietnameseDiacritics,
  localizePolicyItem,
  matchPolicyBySlug,
} from "@/lib/format";

export const revalidate = 120; // ISR: revalidate mỗi 2 phút

function processAndLocalizePolicies(rawPolicies: any[], locale: string) {
  return rawPolicies.map((p) => localizePolicyItem(p, locale));
}

function resolveCurrentPolicy(processedPolicies: any[], slug: string, _locale: string) {
  const matched = matchPolicyBySlug(processedPolicies, slug);
  if (matched) return matched;
  return processedPolicies[0];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const policiesResult = await getPolicies({ lang: locale }).catch(() => null);
  const policies = Array.isArray(policiesResult?.data) ? policiesResult.data : [];

  const processedPolicies = processAndLocalizePolicies(policies, locale);
  const currentPolicy = resolveCurrentPolicy(processedPolicies, slug, locale);

  if (!currentPolicy) {
    return {};
  }

  const isEn = locale === 'en';
  const title = currentPolicy.title || currentPolicy.name || "";
  const description = currentPolicy.seo_description || currentPolicy.meta_description || "";

  const enSeoTitleCandidate = [currentPolicy.seo_title, currentPolicy.meta_title, title].find(
    (v) => typeof v === "string" && v.trim().length > 0 && !hasVietnameseDiacritics(v)
  );
  const seoTitle = isEn
    ? (enSeoTitleCandidate || title)
    : (currentPolicy.seo_title || currentPolicy.meta_title || title);
  const rawSeoDesc = currentPolicy.seo_description || currentPolicy.meta_description || description;
  const seoDescription = isEn && hasVietnameseDiacritics(rawSeoDesc)
    ? (title ? `${title} | Co Thao Tom Ca` : "")
    : (rawSeoDesc || (isEn && title ? `${title} | Co Thao Tom Ca` : ""));
  const rawSeoKeywords = currentPolicy.seo_keywords || currentPolicy.meta_keywords || "";
  const seoKeywords = isEn && hasVietnameseDiacritics(rawSeoKeywords) ? "" : rawSeoKeywords;

  const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'))
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'https://cothaotomca.vn';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const slugVi = currentPolicy.slug_vi || slug;
  const slugEn = currentPolicy.slug_en || slug;
  const viUrl = `${baseUrl}/chinh-sach/${slugVi}`;
  const enUrl = `${baseUrl}/en/policy/${slugEn}`;
  const canonicalUrl = isEn ? enUrl : viUrl;

  let policyImage = currentPolicy.og_image || currentPolicy.image || "/cover.jpg";
  if (policyImage && policyImage.includes('localhost:3000')) {
    policyImage = policyImage.replace(/https?:\/\/localhost:3000/g, baseUrl);
  }
  const customRobots = currentPolicy.meta_robots || undefined;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    robots: customRobots,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        'x-default': viUrl,
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

  const policiesResult = await getPolicies({ lang: locale }).catch(() => ({ data: [] }));
  const policies = Array.isArray(policiesResult?.data) ? policiesResult.data : [];

  const processedPolicies = processAndLocalizePolicies(policies, locale);
  const currentPolicy = resolveCurrentPolicy(processedPolicies, slug, locale);

  if (!currentPolicy) {
    return (
      <div className="container py-20 text-center">
        <h1 className="display-4 text-primary">
          {locale === "en" ? "Content not found" : "Không tìm thấy nội dung"}
        </h1>
      </div>
    );
  }

  const breadcrumbs = [
    { title: currentPolicy.title || currentPolicy.name }
  ];

  const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes('localhost:3000'))
    ? process.env.NEXT_PUBLIC_BASE_URL
    : 'https://cothaotomca.vn';
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const slugVi = currentPolicy.slug_vi || slug;
  const slugEn = currentPolicy.slug_en || slug;
  const alternateLinks = {
    vi: {
      pathname: "/policy/[slug]",
      params: { slug: slugVi },
    },
    en: {
      pathname: "/policy/[slug]",
      params: { slug: slugEn },
    },
  };

  return (
    <main className="md:py-12 py-8 xl:pt-16 xl:pb-12">
      <AlternateLinksUpdater links={alternateLinks} />
      <JsonLd
        type="Article"
        data={currentPolicy}
        url={locale === 'en' ? `${baseUrl}/en/policy/${slugEn}` : `${baseUrl}/chinh-sach/${slugVi}`}
      />
      <div className="container space-y-3">
        <Breadcrumb breadcrumbs={breadcrumbs} />

        <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8 items-start">
          <aside className="col-span-full lg:col-span-4">
            <PolicyNav
              policies={processedPolicies.map(p => ({ id: p.id, slug: p.slug, title: p.title || p.name }))}
              currentSlug={currentPolicy.slug || slug}
            />
          </aside>

          <article className="col-span-full lg:col-span-8">
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
