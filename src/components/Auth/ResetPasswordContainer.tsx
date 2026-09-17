"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { verifyResetOtpApi } from "@/services/authService";

export default function ResetPasswordContainer() {
  const t = useTranslations("reset_password");
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialToken = searchParams.get("token") || "";
  const initialEmail = searchParams.get("email") || "";

  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [success, setSuccess] = useState(false);

  // Sync from query params if available
  useEffect(() => {
    if (initialToken) setToken(initialToken);
    if (initialEmail) setEmail(initialEmail);
  }, [initialToken, initialEmail]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      router.push("/signin");
    }
  }, [success, countdown, router]);

  // Step 1 if no token: Verify OTP to retrieve token
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (otpCode.trim().length !== 6) {
      setError("Vui lòng nhập đúng 6 chữ số mã OTP.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await verifyResetOtpApi(email.trim(), otpCode.trim());
      if (res.token) {
        setToken(res.token);
        setMessage("Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.");
      } else {
        setError("Mã OTP không hợp lệ.");
      }
    } catch (err: any) {
      setError(err.message || "Mã xác thực OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit new password
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      setError(t("error_missing_token"));
      return;
    }

    if (password.length < 6) {
      setError(t("error_length"));
      return;
    }

    if (password !== passwordConfirmation) {
      setError(t("error_mismatch"));
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const API_URL = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
    ).replace(/\/$/, "");

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token,
          email: email.trim(),
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const body = await res.json();

      if (res.ok) {
        setMessage(body.message || t("success_default"));
        setSuccess(true);
        setPassword("");
        setPasswordConfirmation("");
      } else {
        const errorMessage =
          body.errors?.password?.[0] || body.message || body.error || t("error_default");
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  const hasValidToken = Boolean(token && email);

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
        <div className="absolute inset-0 z-10 bg-black/30" />
      </div>

      {/* Container Card */}
      <div className="relative z-20 w-full max-w-[440px] px-4 flex flex-col items-center">
        <div className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col bg-yellow">
          {/* Header Title */}
          <div className="text-center space-y-2 mb-4">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-primary font-display leading-tight tracking-[0.01em]">
              {t("title")}
            </h1>
            <p className="text-gray-600 max-w-[400px] mx-auto text-xs sm:text-sm leading-relaxed">
              {hasValidToken ? (
                <>
                  {t("description")}: <br />
                  <span className="font-semibold text-primary">{email}</span>
                </>
              ) : (
                "Nhập email và mã OTP 6 số nhận được để tạo mật khẩu mới."
              )}
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-medium text-center p-3 rounded-xl mb-3 animate-in fade-in">
              {message}
            </div>
          )}

          {error && (
            <div className="text-red-700 bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-center p-3 rounded-xl mb-3 animate-in fade-in">
              {error}
            </div>
          )}

          {/* CASE 1: No valid token yet -> OTP input form */}
          {!hasValidToken && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 w-full">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-primary block">
                  Email tài khoản
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
                <label className="text-xs uppercase tracking-wider text-gray-600 font-bold block">
                  Mã OTP 6 chữ số
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  required
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
                {loading ? "Đang xác thực..." : "Xác nhận OTP & Tiếp tục"}
              </button>

              <div className="text-center pt-2 text-xs">
                <Link
                  href="/forgot-password"
                  className="text-gray-500 hover:text-primary transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>Yêu cầu gửi lại mã OTP</span>
                </Link>
              </div>
            </form>
          )}

          {/* CASE 2: Token is ready -> Password setup form */}
          {hasValidToken && (
            <form onSubmit={handleSubmitPassword} className="flex flex-col gap-4 w-full">
              {/* New Password */}
              <div className="space-y-1.5 text-left">
                <label className="text-sm text-primary font-semibold block">
                  {t("password_label")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={Boolean(success)}
                  placeholder={t("password_placeholder")}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 text-left">
                <label className="text-sm text-primary font-semibold block">
                  {t("confirm_password_label")}
                </label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  disabled={Boolean(success)}
                  placeholder={t("confirm_password_placeholder")}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Countdown when success */}
              {success && (
                <div className="text-center text-xs text-gray-600 italic">
                  {t("redirecting", { count: countdown })}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || Boolean(success)}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  loading || Boolean(success)
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? t("submitting") : t("submit_btn")}
              </button>

              {/* Back to Login */}
              <div className="text-center text-[14px] pt-1">
                <Link
                  href="/signin"
                  className="text-gray-500 hover:text-primary transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>{t("back_to_login")}</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
