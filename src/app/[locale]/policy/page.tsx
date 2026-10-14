import { redirect } from "@/i18n/routing";
import { getPolicies } from "@/services/policyService";
import { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return {
    title: isEn ? "Policies | Co Thao Tom Ca" : "Chính sách | Cô Thảo Tôm Cá",
    description: isEn
      ? "Shipping, return, privacy and payment policies at Co Thao Tom Ca."
      : "Chính sách giao hàng, đổi trả, bảo mật và thanh toán tại Cô Thảo Tôm Cá.",
  };
}

export default async function PolicyIndexPage({ params }: Props) {
  const { locale } = await params;
  const policiesResult = await getPolicies({ lang: locale }).catch(() => ({ data: [] }));
  const policies = Array.isArray(policiesResult?.data) ? policiesResult.data : [];
  const firstPolicySlug = policies[0]?.slug || 'chinh-sach-giao-hang';

  redirect({
    href: {
      pathname: '/policy/[slug]',
      params: { slug: firstPolicySlug }
    },
    locale: locale as any
  });
}
