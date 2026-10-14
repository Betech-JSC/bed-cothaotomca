import { redirect } from "@/i18n/routing";
import { getPolicies } from "@/services/policyService";

interface Props {
  params: Promise<{ locale: string }>;
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
