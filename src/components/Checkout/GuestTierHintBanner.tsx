"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

interface GuestTierHintBannerProps {
  tier: "gold" | "diamond";
  discountPercent: number;
  loginHref: string;
  onDismiss: () => void;
  autoDismissMs?: number;
  isUpgradeCelebration?: boolean;
}

export default function GuestTierHintBanner({
  tier,
  discountPercent,
  loginHref,
  onDismiss,
  autoDismissMs = 0,
  isUpgradeCelebration = false,
}: GuestTierHintBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = () => {
    if (autoDismissMs > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimer();
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs]);

  const tierLabel = tier === "diamond" ? "DIAMOND" : "GOLD";

  return (
    <div
      className="flex items-start justify-between gap-2 bg-primary/5 border border-primary/20 rounded-[4px] px-3 py-2 mt-1.5 animate-fade-in"
      onMouseEnter={resetTimer}
      role="status"
      aria-live="polite"
    >
      <p className="font-serif text-sm text-primary leading-snug flex-1 min-w-0">
        {isUpgradeCelebration ? (
          <>
            🎉 Chúc mừng bạn vừa thăng hạng{" "}
            <span className="font-bold text-secondary">{tierLabel}</span>!{" "}
            <Link
              href={loginHref}
              className="font-bold text-primary underline-offset-2 hover:underline"
            >
              Đăng nhập
            </Link>{" "}
            để nhận ngay ưu đãi{" "}
            <span className="font-bold text-secondary">
              Mừng lên hạng giảm {discountPercent}%
            </span>{" "}
            cho đơn hàng này.
          </>
        ) : (
          <>
            🎁 Số điện thoại này đang có ưu đãi giảm{" "}
            <span className="font-bold text-secondary">{discountPercent}%</span>{" "}
            hạng{" "}
            <span className="font-bold text-secondary">{tierLabel}</span>.{" "}
            <Link
              href={loginHref}
              className="font-bold text-primary underline-offset-2 hover:underline"
            >
              Đăng nhập
            </Link>{" "}
            để nhận ưu đãi ngay.
          </>
        )}
      </p>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={onDismiss}
        className="text-primary/60 hover:text-primary font-bold text-base leading-none cursor-pointer shrink-0 mt-0.5"
      >
        ×
      </button>
    </div>
  );
}
