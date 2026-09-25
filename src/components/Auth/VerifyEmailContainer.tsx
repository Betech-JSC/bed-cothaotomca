"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { verifyEmailApi, resendActivationApi } from "@/services/authService";

export default function VerifyEmailContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  const tokenParam = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(Boolean(tokenParam));
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const hasAttemptedTokenVerification = useRef(false);

  // Countdown timer for resending
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Auto-verify when ?token=... is present in the URL
  useEffect(() => {
    if (!tokenParam || hasAttemptedTokenVerification.current) return;
    hasAttemptedTokenVerification.current = true;

    const runTokenVerification = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const res = await verifyEmailApi({
          token: tokenParam,
          email: emailParam || undefined,
        });

        if (res.token && res.user) {
          loginWithToken(res.token, res.user);
          setSuccess("🎉 Kích hoạt tài khoản thành công! Đang chuyển hướng vào trang cá nhân...");
          setTimeout(() => {
            router.push("/profile");
          }, 1500);
        } else {
          setError(res.message || "Xác thực tài khoản thất bại.");
        }
      } catch (err: any) {
        setError(err.message || "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn.");
      } finally {
        setLoading(false);
      }
    };

    runTokenVerification();
  }, [tokenParam, emailParam, loginWithToken, router]);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (otpCode.trim().length !== 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await verifyEmailApi({
        email: email.trim(),
        otp_code: otpCode.trim(),
      });

      if (res.token && res.user) {
        loginWithToken(res.token, res.user);
        setSuccess("🎉 Kích hoạt tài khoản thành công! Đang chuyển hướng vào trang cá nhân...");
        setTimeout(() => {
          router.push("/profile");
        }, 1500);
      } else {
        setError(res.message || "Xác thực tài khoản thất bại.");
      }
    } catch (err: any) {
      setError(err.message || "Mã xác thực không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await resendActivationApi(email.trim());
      setCountdown(60);
      setSuccess(res.message || "Mã kích hoạt mới đã được gửi tới email của bạn!");
    } catch (err: any) {
      setError(err.message || "Không thể gửi lại mã kích hoạt.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-6.5rem)] flex items-center justify-center py-8 lg:py-12 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-login.jpg"
          alt="Bếp Cô Thảo"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 z-10 bg-black/30" />
      </div>

      {/* Container Card */}
      <div className="relative z-20 w-full max-w-[440px] px-4 flex flex-col items-center">
        <div className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col bg-yellow">
          {/* Header */}
          <div className="text-center space-y-2 mb-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-2">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-primary font-display leading-tight tracking-[0.01em]">
              Xác thực Tài khoản
            </h1>
            <p className="text-gray-600 max-w-[380px] mx-auto text-xs sm:text-sm leading-relaxed">
              Kích hoạt tài khoản thành viên để bắt đầu tích điểm và nhận các đặc quyền ưu đãi.
            </p>
          </div>

          {/* Loading state for token verification */}
          {tokenParam && loading && !success && (
            <div className="py-8 text-center space-y-3">
              <div className="inline-block size-8 border-3 border-secondary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-700">
                Đang xác thực tài khoản của bạn qua liên kết email...
              </p>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-center text-xs sm:text-sm font-medium space-y-2 mb-4 animate-in fade-in">
              <p className="font-bold">{success}</p>
              <div className="flex justify-center">
                <div className="inline-block size-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center text-xs sm:text-sm font-medium mb-4 animate-in fade-in">
              {error}
            </div>
          )}

          {/* Form for manual OTP entry or when link expired */}
          {(!tokenParam || (!loading && !success)) && (
            <form onSubmit={handleManualVerify} className="flex flex-col gap-4 w-full">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-primary block">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[42px] text-gray-900"
                />
              </div>

              <div className="space-y-1 text-center">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                  Mã OTP 6 chữ số
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full text-center text-2xl sm:text-3xl font-mono font-bold tracking-[0.35em] rounded-2xl border border-gray-300 bg-white px-4 py-3 text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 h-[52px] shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6 || !email.trim()}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  loading || otpCode.trim().length !== 6 || !email.trim()
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? "Đang xử lý..." : "Xác nhận kích hoạt"}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                <span>Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || resending || !email.trim()}
                  className={`font-bold transition-all ${
                    countdown > 0 || !email.trim()
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-secondary hover:underline cursor-pointer"
                  }`}
                >
                  {countdown > 0 ? `Gửi lại (${countdown}s)` : "Gửi lại mã kích hoạt"}
                </button>
              </div>

              <div className="text-center pt-2 text-xs">
                <Link
                  href="/signin"
                  className="text-gray-500 hover:text-primary transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>Quay lại Đăng nhập</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
