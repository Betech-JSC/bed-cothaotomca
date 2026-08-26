"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ResetPasswordContainer() {
  const t = useTranslations("reset_password");
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
        setMessage(body.message || t("success_default"));
        setSuccess(true);
        setPassword("");
        setPasswordConfirmation("");
      } else {
        const errorMessage = body.errors?.password?.[0] || body.message || body.error || t("error_default");
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(t("network_error"));
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
        {/* Dark Overlay */}
        <div
          className="absolute inset-0 z-10 bg-black/30"
        />
      </div>

      {/* Container Card */}
      <div className="relative z-20 w-full max-w-[440px] px-4 flex flex-col items-center">
        <div
          className="w-full rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl flex flex-col bg-yellow"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            {/* Header Title */}
            <div className="text-center space-y-2">
              <h1 className="text-[28px] md:text-[32px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
                {t("title")}
              </h1>
              <p className="body-2 text-gray-700/80 font-serif max-w-[400px] mx-auto">
                {t("description")}: <br />
                <span className="font-semibold text-primary">{email || "—"}</span>
              </p>
            </div>

            {isInvalidUrl && (
              <div className="text-red-600 text-sm font-serif text-center bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                <p>{t("error_missing_token")}</p>
              </div>
            )}

            {!isInvalidUrl && (
              <>
                {/* New Password */}
                <div className="space-y-1.5 text-left">
                  <label className="body-2 text-primary font-semibold block font-serif">
                    {t("password_label")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={success}
                    placeholder={t("password_placeholder")}
                    className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 text-left">
                  <label className="body-2 text-primary font-semibold block font-serif">
                    {t("confirm_password_label")}
                  </label>
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    disabled={success}
                    placeholder={t("confirm_password_placeholder")}
                    className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                  />
                </div>
              </>
            )}

            {/* Status Message */}
            {message && (
              <div className="text-secondary font-bold text-sm font-serif text-center bg-yellow/60 p-3 rounded-xl border border-secondary/30">
                {message}
                <p className="text-xs text-brown/80 mt-1">{t("redirecting", { count: countdown })}</p>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm font-serif text-center bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
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
                {loading ? t("submitting") : t("submit_btn")}
              </button>
            )}

            {/* Back to Login Link */}
            <div className="text-center font-serif text-[14px] mt-2">
              <Link
                href="/signin"
                className="text-primary font-bold hover:underline hover:text-secondary transition-all"
              >
                ← {t("back_to_login")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
