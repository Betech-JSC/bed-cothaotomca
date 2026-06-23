import ForgotPasswordContainer from "@/components/Auth/ForgotPasswordContainer";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forgot_password" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ForgotPasswordPage() {
  return (
    <main>
      <ForgotPasswordContainer />
    </main>
  );
}
