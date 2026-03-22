import Breadcrumb from "@/components/Common/Breadcrumb";
import { Link } from "@/i18n/routing";
import { getPolicies } from "@/services/policyService";

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
      <div className="container space-y-3">
        <Breadcrumb breadcrumbs={breadcrumbs} />

        <div className="grid grid-cols-12 md:gap-6 gap-4 xl:gap-8 items-start">
          <aside className="col-span-full lg:col-span-3 h-full">
            <div className="sticky top-24">
              <div className="bg-white rounded-[16px] overflow-hidden shadow-sm">
                <nav className="flex flex-col p-2 space-y-2">
                  {processedPolicies.map((policy) => {
                    const isActive = policy.slug === slug;
                    return (
                      <Link
                        key={policy.id}
                        href={{ pathname: '/policy/[slug]', params: { slug: policy.slug } }}
                        className={`p-3 transition-all duration-300 rounded-[12px] ${isActive
                          ? "bg-primary text-yellow shadow-lg"
                          : "text-gray-900 lg:hover:text-[#142A68] lg:hover:bg-gray-50"
                          } title-3`}
                      >
                        {policy.title || policy.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>
          </aside>

          <article className="col-span-full lg:col-span-9">
            <div className="bg-white rounded-[24px] md:p-4 p-3 xl:p-6">
              <div className="space-y-3">
                <h1 className="display-3 text-primary">{currentPolicy.title || currentPolicy.name}</h1>
                <div
                  className="prose prose-policy max-w-full"
                  dangerouslySetInnerHTML={{ __html: currentPolicy.content }}
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
