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

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SignInPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="w-full min-h-[90vh] bg-yellow flex items-center justify-center">
            <div className="animate-pulse text-primary font-bold text-lg font-serif">Đang tải...</div>
          </div>
        }
      >
        <SignInContainer />
      </Suspense>
    </main>
  );
}
