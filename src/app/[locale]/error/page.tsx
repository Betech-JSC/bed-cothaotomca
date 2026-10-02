import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/i18n-navigation";
import { defaultLocale, locales as supportedLocales } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale?: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || defaultLocale;
  const useLocale = supportedLocales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: useLocale, namespace: "errors.500" });

  return {
    title: `${t("subtitle") || "Đã có lỗi xảy ra"} | Cô Thảo Tôm Cá`,
    description: t("description") || "Trang thông báo lỗi hệ thống Cô Thảo Tôm Cá",
    robots: { index: false, follow: false },
  };
}

export default async function ErrorPage({ params }: { params: Promise<{ locale?: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || defaultLocale;
  const useLocale = supportedLocales.includes(locale as any) ? locale : defaultLocale;
  const t = await getTranslations({ locale: useLocale, namespace: "errors.500" });

  return (
    <main className="min-h-[500px] md:min-h-[700px] flex items-center justify-center bg-yellow p-6">
      <div className="container">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="space-y-3">
            <h1 className="display-1 font-bold text-primary">{t("title") || "500"}</h1>
            <h2 className="title-1 font-display font-bold text-secondary">
              {t("subtitle") || "Đã có lỗi xảy ra"}
            </h2>
            <p className="body-1 text-gray-700 max-w-md mx-auto">
              {t("description") || "Hệ thống đang gặp sự cố gián đoạn tạm thời. Vui lòng thử lại sau hoặc quay về trang chủ."}
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/"
              className="btn btn-secondary w-[200px]"
            >
              {t("go_home") || "Về trang chủ"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
