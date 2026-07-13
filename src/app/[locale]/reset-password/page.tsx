import ResetPasswordContainer from "@/components/Auth/ResetPasswordContainer";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reset_password" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ResetPasswordPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="min-h-[90vh] flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        }
      >
        <ResetPasswordContainer />
      </Suspense>
    </main>
  );
}
