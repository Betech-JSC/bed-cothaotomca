import SignInContainer from "@/components/Auth/SignInContainer";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
      <SignInContainer />
    </main>
  );
}
