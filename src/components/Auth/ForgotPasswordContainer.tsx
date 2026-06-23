"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import AnimateOnScroll from "@/components/Animated/animated-appear";

export default function ForgotPasswordContainer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const body = await res.json();

      if (res.ok) {
        setMessage(body.message || "Chúng tôi đã gửi đường dẫn đặt lại mật khẩu tới email của bạn.");
        setEmail("");
      } else {
        // Lấy lỗi validation hoặc lỗi chung từ backend
        const errorMessage = body.errors?.email?.[0] || body.error || body.message || "Gửi yêu cầu thất bại. Vui lòng thử lại.";
        setError(errorMessage);
      }
    } catch (err: any) {
      setError("Đã xảy ra lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  };

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

      {/* Container Card */}
      <div className="relative z-20 w-full max-w-[560px] px-4 flex flex-col items-center gap-6">
        <AnimateOnScroll animate="slideup" delay={0} className="w-full">
          <div
            className="w-full rounded-[32px] pt-[48px] pr-[48px] pb-[32px] pl-[48px] shadow-2xl flex flex-col gap-6 max-md:px-6 max-md:py-8 max-md:pt-10 max-md:pb-6"
            style={{
              backgroundColor: "#F1EEDF",
              minHeight: "420px",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
              {/* Header Title */}
              <div className="text-center space-y-2">
                <h1 className="text-[32px] md:text-[36px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
                  Quên Mật Khẩu
                </h1>
                <p className="body-2 text-gray-700/80 font-serif max-w-[400px] mx-auto">
                  Nhập địa chỉ email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi một liên kết để bạn đặt lại mật khẩu mới.
                </p>
              </div>

              {/* Input Email */}
              <div className="space-y-1.5 text-left">
                <label className="body-2 text-primary font-semibold block font-serif">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="nhập email của bạn (ví dụ: name@gmail.com)"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Status Message */}
              {message && (
                <div className="text-green-600 text-sm font-serif text-center bg-green-50 p-3 rounded-xl border border-green-100">
                  🎉 {message}
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm font-serif text-center bg-red-50 p-3 rounded-xl border border-red-100">
                  ⚠️ {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full btn btn-secondary text-white font-bold h-[44px] rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Đang gửi yêu cầu..." : "Gửi yêu cầu khôi phục"}
              </button>

              {/* Back to Login Link */}
              <div className="text-center font-serif text-[14px]">
                <Link
                  href="/signin"
                  className="text-primary font-bold hover:underline hover:text-secondary transition-all"
                >
                  ← Quay lại Đăng nhập
                </Link>
              </div>
            </form>
          </div>
        </AnimateOnScroll>

        {/* Support Hotline Pill Badge */}
        <AnimateOnScroll animate="slideup" delay={200}>
          <a
            href="tel:0336298906"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-yellow hover:bg-secondary duration-300 shadow-md font-serif text-sm font-semibold tracking-[0.02em] transition-all"
            style={{
              backgroundColor: "#142A68",
              color: "#F1EEDF",
            }}
          >
            <span>SĐT hỗ trợ: 0336 298 906</span>
          </a>
        </AnimateOnScroll>
      </div>
    </div>
  );
}
