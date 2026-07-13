import RegisterForm from "@/components/Auth/RegisterForm";
import Image from "next/image";
import AnimateOnScroll from "@/components/Animated/animated-appear";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signup" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="relative min-h-[90vh] flex items-center justify-center py-16 md:py-24 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-login.jpg"
          alt="Bữa ăn hải sản ấm cúng"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{ backgroundColor: "#0000004D" }}
        />
      </div>

      {/* Register Card Container */}
      <div className="relative z-20 w-full max-w-[560px] px-4 flex flex-col items-center gap-6">
        <AnimateOnScroll animate="slideup" delay={0} className="w-full">
          <div
            id="register-card"
            className="w-full rounded-[32px] pt-[40px] pr-[48px] pb-[24px] pl-[48px] shadow-2xl flex flex-col gap-5 max-md:px-6 max-md:py-8 max-md:pt-8 max-md:pb-6"
            style={{
              backgroundColor: "#F1EEDF",
              minHeight: "518px",
            }}
          >
            <RegisterForm />
          </div>
        </AnimateOnScroll>

        {/* Support Hotline Pill Badge */}
        <AnimateOnScroll animate="slideup" delay={200}>
          <a
            id="hotline-badge"
            href="tel:0336298906"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-yellow hover:bg-secondary duration-300 shadow-md font-serif text-sm font-semibold tracking-[0.02em] transition-all"
            style={{
              backgroundColor: "#142A68",
              color: "#F1EEDF",
            }}
          >
            <span>SĐT: 0336 298 906</span>
          </a>
        </AnimateOnScroll>
      </div>
    </main>
  );
}
