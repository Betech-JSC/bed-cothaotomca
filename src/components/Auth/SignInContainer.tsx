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
      <div className="w-full min-h-[90vh] bg-[#F1EEDF] flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-lg font-serif">Loading...</div>
      </div>
    );
  }

  // Guest/LoginForm view
  return (
    <div className="relative min-h-[90vh] w-full flex items-center justify-center py-16 md:py-24 overflow-hidden">
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

      {/* Login Card Container */}
      <div className="relative z-20 w-full max-w-[560px] px-4 flex flex-col items-center gap-6">
        <AnimateOnScroll animate="slideup" delay={0} className="w-full">
          <div
            id="login-card"
            className="w-full rounded-[32px] pt-[48px] pr-[48px] pb-[24px] pl-[48px] shadow-2xl flex flex-col gap-6 max-md:px-6 max-md:py-8 max-md:pt-10 max-md:pb-6"
            style={{
              backgroundColor: "#F1EEDF",
              minHeight: "518px",
            }}
          >
            <LoginForm onLoginSuccess={handleLoginSuccess} />
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
    </div>
  );
};

export default SignInContainer;
