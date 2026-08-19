"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useSearchParams } from "next/navigation";
import AnimateOnScroll from "@/components/Animated/animated-appear";

export default function ResetPasswordContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      router.push("/signin");
    }
  }, [success, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      setError("Thiếu thông tin xác thực hoặc email. Vui lòng sử dụng liên kết trong email khôi phục mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Mật khẩu nhập lại không trùng khớp.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const body = await res.json();

      if (res.ok) {
        setMessage(body.message || "Đặt lại mật khẩu thành công!");
        setSuccess(true);
        setPassword("");
        setPasswordConfirmation("");
      } else {
        const errorMessage = body.errors?.password?.[0] || body.message || body.error || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.";
        setError(errorMessage);
      }
    } catch (err: any) {
      setError("Đã xảy ra lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const isInvalidUrl = !token || !email;

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
        {/* Dark Overlay - Độ phủ đè lên ảnh */}
        <div
          className="absolute inset-0 z-10 bg-black/30"
        />
      </div>

      {/* Container Card */}
      <div className="relative z-20 w-full max-w-[440px] px-4 flex flex-col items-center">
        <div
          className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col"
          style={{
            backgroundColor: "#F6F2E9",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <h1 className="text-[28px] md:text-[32px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
                Đặt Lại Mật Khẩu
              </h1>
              <p className="body-2 text-gray-700/80 font-serif max-w-[400px] mx-auto">
                Thiết lập mật khẩu mới cho tài khoản email: <br />
                <span className="font-semibold text-primary">{email || "chưa xác định"}</span>
              </p>
            </div>

            {isInvalidUrl && (
              <div className="text-red-600 text-sm font-serif text-center bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                <p>⚠️ Đường dẫn không hợp lệ hoặc thiếu thông tin xác thực.</p>
                <p className="text-xs text-gray-600">Vui lòng kiểm tra lại liên kết trong email của bạn hoặc gửi lại yêu cầu mới.</p>
              </div>
            )}

            {!isInvalidUrl && (
              <>
                {/* New Password */}
                <div className="space-y-1.5 text-left">
                  <label className="body-2 text-primary font-semibold block font-serif">
                    Mật khẩu mới (tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={success}
                    placeholder="nhập mật khẩu mới..."
                    className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left">
                  <label className="body-2 text-primary font-semibold block font-serif">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    disabled={success}
                    placeholder="nhập lại mật khẩu mới..."
                    className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                  />
                </div>
              </>
            )}

            {/* Status Message */}
            {message && (
              <div className="text-green-600 text-sm font-serif text-center bg-green-50 p-3 rounded-xl border border-green-100">
                🎉 {message}
                <p className="text-xs text-gray-600 mt-1">Tự động chuyển hướng về trang Đăng nhập sau {countdown} giây...</p>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm font-serif text-center bg-red-50 p-3 rounded-xl border border-red-100">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            {!isInvalidUrl && !success && (
              <button
                type="submit"
                disabled={loading}
                className={`w-full btn btn-secondary text-white font-bold h-[44px] rounded-full shadow-md hover:shadow-lg transition-all duration-300 ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            )}

            {/* Back to Login Link */}
            <div className="text-center font-serif text-[14px] mt-2">
              <Link
                href="/signin"
                className="text-primary font-bold hover:underline hover:text-secondary transition-all"
              >
                ← Quay lại Đăng nhập
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
