import { redirect } from "@/i18n/routing";
import { getPolicies } from "@/services/policyService";
import { localizePolicyItem } from "@/lib/format";
import { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://cothaotomca.vn").replace(/\/$/, "");
  const viUrl = `${baseUrl}/chinh-sach`;
  const enUrl = `${baseUrl}/en/policy`;
  const canonicalUrl = isEn ? enUrl : viUrl;
  const title = isEn ? "Policies | Co Thao Tom Ca" : "Chính sách | Cô Thảo Tôm Cá";
  const description = isEn
    ? "Shipping, return, privacy and payment policies at Co Thao Tom Ca."
    : "Chính sách giao hàng, đổi trả, bảo mật và thanh toán tại Cô Thảo Tôm Cá.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: viUrl,
        en: enUrl,
        "x-default": viUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default async function PolicyIndexPage({ params }: Props) {
  const { locale } = await params;
  const policiesResult = await getPolicies({ lang: locale }).catch(() => ({ data: [] }));
  const policies = Array.isArray(policiesResult?.data) ? policiesResult.data : [];
  const firstPolicy = policies[0] ? localizePolicyItem(policies[0], locale) : null;
  const firstPolicySlug =
    firstPolicy?.slug || (locale === "en" ? "delivery-policy" : "chinh-sach-giao-hang");

  redirect({
    href: {
      pathname: '/policy/[slug]',
      params: { slug: firstPolicySlug }
    },
    locale: locale as any
  });
}
