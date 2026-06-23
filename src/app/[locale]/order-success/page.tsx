import { Link } from "@/i18n/i18n-navigation";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    code?: string;
    phone?: string;
    sync_warning?: string;
  }>;
}

export default async function OrderSuccessPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { code, sync_warning } = await searchParams;
  const t = await getTranslations({ locale });

  const breadcrumbs = [
    { title: t("breadcrumb.product"), url: "/product" as const },
    { title: t("orderSuccess.title") },
  ];

  return (
    <main className="py-10 md:py-16">
      <div className="container max-w-2xl mx-auto space-y-8 text-center">
        <Breadcrumb breadcrumbs={breadcrumbs} classNameNav="mx-auto" />
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-gray-100 space-y-4">
          <h1 className="display-3 text-primary">{t("orderSuccess.title")}</h1>
          {code ? (
            <p className="headline-1 text-secondary">{code}</p>
          ) : null}
          <p className="body-1 text-gray-700">{t("orderSuccess.description")}</p>
          {sync_warning ? (
            <p className="body-1 text-amber-700 bg-amber-50 rounded-lg p-4">
              {t("orderSuccess.sync_warning")}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/product" className="btn btn-primary">
              {t("orderSuccess.continue_shopping")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
