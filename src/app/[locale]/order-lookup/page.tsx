import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import OrderLookupClient from "@/components/Order/OrderLookupClient";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderLookup" });
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const isEn = locale === 'en';
  const rawTitle = t("title") || (isEn ? "Order Lookup" : "Tra cứu đơn hàng");
  const title = `${rawTitle} | ${isEn ? "Co Thao Tom Ca" : "Cô Thảo Tôm Cá"}`;
  const description = t("subtitle") || (isEn
    ? "Look up your order status and shipping progress with Co Thao Tom Ca"
    : "Tra cứu thông tin, tình trạng xử lý và tiến độ giao hàng đơn hàng tại Cô Thảo Tôm Cá");

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/${locale}/order-lookup`,
      languages: {
        vi: `${baseUrl}/vi/tra-cuu-don-hang`,
        en: `${baseUrl}/en/order-lookup`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function OrderLookupPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="w-full min-h-[90vh] bg-white flex items-center justify-center">
            <div className="animate-pulse text-primary font-bold text-lg font-serif">Đang tải...</div>
          </div>
        }
      >
        <OrderLookupClient />
      </Suspense>
    </main>
  );
}
