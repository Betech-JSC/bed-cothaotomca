"use client";

import { useRouter } from "@/i18n/i18n-navigation";
import { useLocale } from "next-intl";
import Image from "next/image";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const nextLocale = locale === "vi" ? "en" : "vi";

  const handleToggle = () => {
    router.replace("/", { locale: nextLocale });
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative size-6 cursor-pointer overflow-hidden rounded-full border-[1.5px] ${locale === "vi" ? "border-white" : "border-transparent"}`}
        aria-label="Chuyển sang tiếng Việt"
      >
        <Image
          src="/images/flag-vn.jpg"
          alt="Chuyển sang tiếng Việt"
          fill
          className="h-full w-full object-cover"
        />
      </button>
      <button
        type="button"
        onClick={handleToggle}
        className={`relative size-6 cursor-pointer overflow-hidden rounded-full border-[1.5px] ${locale === "en" ? "border-white" : "border-transparent"}`}
        aria-label="Switch to English"
      >
        <Image
          src="/images/flag-us.jpg"
          alt="Switch to English"
          fill
          className="h-full w-full object-cover"
        />
      </button>
    </div>
  );
}
