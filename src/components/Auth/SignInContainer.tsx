"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";
import Image from "next/image";
import AnimateOnScroll from "@/components/Animated/animated-appear";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/i18n-navigation";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

// `redirect` là pathname nội bộ động (đã qua getSafeRedirectPath) nên cần ép kiểu
// sang href typed-pathnames của router next-intl tại một điểm duy nhất.
type RouterHref = Parameters<ReturnType<typeof useRouter>["push"]>[0];

const SignInContainer = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirectPath(searchParams?.get("redirect")) as RouterHref;

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTarget);
    }
  }, [user, loading, router, redirectTarget]);

  const handleLoginSuccess = () => {
    router.push(redirectTarget);
  };

  if (loading || user) {
    return (
      <div className="w-full min-h-[90vh] bg-yellow flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-lg">Loading...</div>
      </div>
    );
  }

  // Guest/LoginForm view
  return (
    <div className="relative w-full min-h-[calc(100vh-6.5rem)] flex items-center justify-center py-8 lg:py-12 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-login.jpg"
          alt="Bữa ăn hải sản ấm cúng"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark Overlay - Độ phủ đè lên ảnh chuẩn Figma */}
        <div
          className="absolute inset-0 z-10 bg-black/30"
        />
      </div>

      {/* Login Card Container */}
      <div className="relative z-20 w-full max-w-[420px] sm:max-w-[440px] flex flex-col items-center">
        <div
          id="login-card"
          className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col bg-yellow"
        >
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
};

export default SignInContainer;
