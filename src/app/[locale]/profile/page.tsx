import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ProfileClient from "@/components/Auth/ProfileClient";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const isEn = locale === 'en';
  const rawTitle = t("title") || (isEn ? "My Profile" : "Hồ sơ cá nhân");
  const title = `${rawTitle} | ${isEn ? "Co Thao Tom Ca" : "Cô Thảo Tôm Cá"}`;
  const description = isEn
    ? "Manage your personal profile, delivery addresses, order history and membership loyalty points at Co Thao Tom Ca"
    : "Quản lý thông tin tài khoản, sổ địa chỉ nhận hàng, lịch sử đơn hàng và điểm tích lũy thành viên tại Bếp Cô Thảo Tôm Cá";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/${locale}/profile`,
      languages: {
        vi: `${baseUrl}/vi/trang-ca-nhan`,
        en: `${baseUrl}/en/profile`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function ProfilePage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="w-full min-h-[90vh] bg-yellow flex items-center justify-center">
            <div className="animate-pulse text-primary font-bold text-lg font-serif">Đang tải...</div>
          </div>
        }
      >
        <ProfileClient />
      </Suspense>
    </main>
  );
}
