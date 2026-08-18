import Breadcrumb from "@/components/Common/Breadcrumb";
import { getTranslations } from "next-intl/server";
import OrderSuccessClient from "@/components/Checkout/OrderSuccessClient";

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
  const { code, phone, sync_warning } = await searchParams;
  const t = await getTranslations({ locale });

  const breadcrumbs = [
    { title: t("breadcrumb.product"), url: "/product" as const },
    { title: t("orderSuccess.title") },
  ];

  return (
    <main className="py-10 md:py-16 bg-[#FAF8F5]">
      <div className="container max-w-2xl mx-auto space-y-6">
        {sync_warning ? (
          <div className="px-4">
            <p className="body-1 text-amber-700 bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
              {t("orderSuccess.sync_warning")}
            </p>
          </div>
        ) : null}

        <OrderSuccessClient
          orderCode={code || ""}
          phone={phone}
          locale={locale}
        />
      </div>
    </main>
  );
}
