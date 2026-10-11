"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";
import { verifyResetOtpApi } from "@/services/authService";

export default function ForgotPasswordContainer() {
  const t = useTranslations("forgot_password");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  // Steps: 'request' | 'otp' | 'new_password'
  const [step, setStep] = useState<"request" | "otp" | "new_password">("request");

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((c) => c - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  const API_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  ).replace(/\/$/, "");

  // 1. Send forgot password request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

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
        setMessage(
          body.message || tAuth("otp_recovery_sent")
        );
        setStep("otp");
        setResendCountdown(60);
      } else {
        const errorMessage =
          body.errors?.email?.[0] || body.error || body.message || t("error_default");
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setError(tAuth("otp_invalid_length"));
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await verifyResetOtpApi(email.trim(), cleanOtp);
      if (res.token) {
        setResetToken(res.token);
        setMessage(tAuth("otp_correct_new_password"));
        setStep("new_password");
      } else {
        setError(tAuth("otp_invalid"));
      }
    } catch (err: any) {
      setError(err.message || tAuth("otp_invalid_or_expired"));
    } finally {
      setLoading(false);
    }
  };

  // 3. Reset to new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError(tAuth("password_min"));
      return;
    }
    if (password !== passwordConfirmation) {
      setError(tAuth("password_mismatch"));
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          token: resetToken,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const body = await res.json();

      if (res.ok) {
        setMessage(tAuth("reset_password_success"));
        setTimeout(() => {
          router.push("/signin");
        }, 1500);
      } else {
        const errorMessage =
          body.errors?.password?.[0] || body.message || body.error || tAuth("reset_password_failed");
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(t("network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-6.5rem)] flex items-center justify-center py-8 lg:py-12 px-4 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/bg-login.jpg"
          alt={tAuth("bg_image_alt")}
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
          <div className="text-center space-y-2 mb-4">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-primary font-display leading-tight tracking-[0.01em]">
              {step === "new_password" ? tAuth("create_new_password") : t("title")}
            </h1>
            <p className="text-gray-600 max-w-[400px] mx-auto text-xs sm:text-sm leading-relaxed">
              {step === "request" && t("description")}
              {step === "otp" && (
                <>
                  {tAuth("otp_sent_to_email")} <br />
                  <span className="font-bold text-primary">{email}</span>
                </>
              )}
              {step === "new_password" && tAuth("set_new_password_desc")}
            </p>
          </div>

          {/* Feedback messages */}
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

          {/* STEP 1: REQUEST RESET LINK */}
          {step === "request" && (
            <form onSubmit={handleRequestReset} className="flex flex-col gap-4 w-full">
              <div className="space-y-1.5 text-left">
                <label className="text-sm text-primary font-semibold block">
                  {t("email_label")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("email_placeholder")}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-base md:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  loading || !email.trim()
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? t("submitting") : t("submit_btn")}
              </button>

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

          {/* STEP 2: ENTER OTP CODE */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 w-full">
              <div className="space-y-1.5 text-center">
                <label className="text-xs uppercase tracking-wider text-gray-600 font-bold block">
                  {tAuth("otp_label")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  autoFocus
                  className="w-full text-center text-2xl sm:text-3xl font-mono font-bold tracking-[0.35em] rounded-2xl border border-gray-300 bg-white px-4 py-3 text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 h-[52px] shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  loading || otpCode.trim().length !== 6
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? tAuth("verifying") : tAuth("confirm_otp")}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                <span>{tAuth("no_code_received")}</span>
                <button
                  type="button"
                  onClick={handleRequestReset}
                  disabled={resendCountdown > 0 || loading}
                  className={`font-bold transition-all ${
                    resendCountdown > 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-secondary hover:underline cursor-pointer"
                  }`}
                >
                  {resendCountdown > 0 ? tAuth("resend_countdown", { seconds: resendCountdown }) : tAuth("resend_code")}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-gray-500 hover:text-primary transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>←</span>
                  <span>{tAuth("reenter_different_email")}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === "new_password" && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4 w-full">
              <div className="space-y-1.5 text-left">
                <label className="text-sm text-primary font-semibold block">
                  {tAuth("new_password_label")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={tAuth("new_password_placeholder")}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-base md:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-sm text-primary font-semibold block">
                  {tAuth("confirm_new_password_label")}
                </label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  placeholder={tAuth("confirm_new_password_placeholder")}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-base md:text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 6 || password !== passwordConfirmation}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  loading || password.length < 6 || password !== passwordConfirmation
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? tAuth("saving") : tAuth("confirm_change_password")}
              </button>

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
