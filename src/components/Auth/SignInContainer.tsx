"use client";

import { useEffect } from "react";
import LoginForm from "./LoginForm";
import Image from "next/image";
import AnimateOnScroll from "@/components/Animated/animated-appear";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/i18n-navigation";

const SignInContainer = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/profile");
    }
  }, [user, loading, router]);

  const handleLoginSuccess = () => {
    router.push("/profile");
  };

  if (loading || user) {
    return (
      <div className="w-full min-h-[90vh] bg-yellow flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-lg font-serif">Loading...</div>
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
