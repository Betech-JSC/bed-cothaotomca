"use client";

import React from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export interface MobileBackButtonProps {
  fallbackUrl: string;
  label?: string;
  className?: string;
}

export default function MobileBackButton({
  fallbackUrl,
  label,
  className = "",
}: MobileBackButtonProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const displayLabel = label || t("back") || "Quay lại";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl as any);
    }
  };

  return (
    <div className={`lg:hidden ${className}`}>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-primary font-medium text-xs sm:text-sm transition-colors border border-primary/10 shadow-xs active:scale-95 cursor-pointer select-none"
        aria-label={displayLabel}
      >
        <svg
          className="size-4 stroke-current shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>{displayLabel}</span>
      </button>
    </div>
  );
}
