import RegisterForm from "@/components/Auth/RegisterForm";
import Image from "next/image";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signup" });
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const isEn = locale === 'en';
  const rawTitle = t("title") || (isEn ? "Sign Up" : "Đăng ký tài khoản");
  const title = `${rawTitle} | ${isEn ? "Co Thao Tom Ca" : "Cô Thảo Tôm Cá"}`;
  const description = t("description") || (isEn
    ? "Create a Co Thao Tom Ca account to enjoy member discounts, track orders and earn points"
    : "Đăng ký tài khoản Bếp Cô Thảo Tôm Cá để nhận ưu đãi thành viên, theo dõi đơn hàng và tích lũy điểm thưởng");

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/${locale}/signup`,
      languages: {
        vi: `${baseUrl}/vi/dang-ky`,
        en: `${baseUrl}/en/signup`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="relative w-full min-h-[calc(100vh-6.5rem)] flex items-center justify-center py-8 lg:py-12 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-login.jpg"
          alt="Bữa ăn hải sản ấm cúng"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark Overlay - Độ phủ đè lên ảnh */}
        <div
          className="absolute inset-0 z-10 bg-black/30"
        />
      </div>

      {/* Register Card Container */}
      <div className="relative z-20 w-full max-w-[440px] sm:max-w-[460px] flex flex-col items-center">
        <div
          id="register-card"
          className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col gap-4 bg-yellow"
        >
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
