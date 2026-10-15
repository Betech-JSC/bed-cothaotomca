import SignInContainer from "@/components/Auth/SignInContainer";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signin" });
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cothaotomca.vn').replace(/\/$/, '');
  const isEn = locale === 'en';
  const rawTitle = t("title") || (isEn ? "Sign In" : "Đăng nhập");
  const title = `${rawTitle} | ${isEn ? "Co Thao Tom Ca" : "Cô Thảo Tôm Cá"}`;
  const description = t("description") || (isEn
    ? "Sign in to your Co Thao Tom Ca account to view order history and earn points"
    : "Đăng nhập tài khoản Bếp Cô Thảo Tôm Cá để theo dõi đơn hàng và tích lũy ưu đãi");

  const viUrl = `${baseUrl}/dang-nhap`;
  const enUrl = `${baseUrl}/en/signin`;
  const canonicalUrl = isEn ? enUrl : viUrl;

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

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main>
      <Suspense
        fallback={
          <div className="w-full min-h-[90vh] bg-yellow flex items-center justify-center">
            <div className="animate-pulse text-primary font-bold text-lg font-serif">
              {locale === "en" ? "Loading..." : "Đang tải..."}
            </div>
          </div>
        }
      >
        <SignInContainer />
      </Suspense>
    </main>
  );
}
