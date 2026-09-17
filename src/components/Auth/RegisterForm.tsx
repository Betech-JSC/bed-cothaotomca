"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkAvailability,
  verifyEmailApi,
  resendActivationApi,
  type AvailabilityResponse,
} from "@/services/authService";

const RegisterForm = () => {
  const t = useTranslations("signup");
  const { register, loginWithGoogle, loginWithToken } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    type: "phone" | "email" | "both";
    message: string;
    loginUrl: string;
    forgotUrl: string;
  } | null>(null);

  // Real-time availability check states
  const [phoneAvailability, setPhoneAvailability] = useState<AvailabilityResponse | null>(null);
  const [emailAvailability, setEmailAvailability] = useState<AvailabilityResponse | null>(null);

  // Activation screen state
  const [isActivating, setIsActivating] = useState(false);
  const [activationEmail, setActivationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);

  // Timer for resend countdown
  useEffect(() => {
    if (isActivating && resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isActivating, resendCountdown]);

  // Debounced check for Phone availability (300ms)
  const phoneTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const rawPhone = formData.phone.trim();
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);

    if (rawPhone.length >= 9) {
      phoneTimerRef.current = setTimeout(async () => {
        const res = await checkAvailability("phone", rawPhone);
        setPhoneAvailability(res.exists ? res : null);
      }, 300);
    } else {
      setPhoneAvailability(null);
    }

    return () => {
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    };
  }, [formData.phone]);

  // Debounced check for Email availability (300ms)
  const emailTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const rawEmail = formData.email.trim();
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

    if (rawEmail.includes("@") && rawEmail.includes(".")) {
      emailTimerRef.current = setTimeout(async () => {
        const res = await checkAvailability("email", rawEmail);
        setEmailAvailability(res.exists ? res : null);
      }, 300);
    } else {
      setEmailAvailability(null);
    }

    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    };
  }, [formData.email]);

  // Google Sign-In initialization
  useEffect(() => {
    if (loading || isActivating || typeof window === "undefined") return;

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
        });

        const btnElement = document.getElementById("google-signin-btn-register");
        if (btnElement) {
          google.accounts.id.renderButton(btnElement, {
            text: "signup_with",
            theme: "outline",
            size: "large",
            width: btnElement.clientWidth || 382,
            logo_alignment: "left",
          });
        }
      }
    };

    const handleGoogleCredential = async (response: any) => {
      setLoading(true);
      setError(null);
      const res = await loginWithGoogle(response.credential);
      setLoading(false);

      if (res.success) {
        router.push("/profile");
      } else {
        setError(res.message || "Xác thực tài khoản Google thất bại.");
      }
    };

    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogle();
      };
      document.body.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [loading, isActivating, loginWithGoogle, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (duplicateAlert) {
      if (
        (duplicateAlert.type === "phone" && name === "phone") ||
        (duplicateAlert.type === "email" && name === "email") ||
        duplicateAlert.type === "both"
      ) {
        setDuplicateAlert(null);
      }
    }
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDuplicateAlert(null);

    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      if (res.success) {
        setDuplicateAlert(null);
        if (res.requires_activation) {
          setIsActivating(true);
          setActivationEmail(formData.email);
          setResendCountdown(60);
          setOtpSuccess("Đăng ký thành công! Vui lòng nhập mã OTP 6 số để kích hoạt tài khoản.");
        } else {
          router.push("/profile");
        }
      } else {
        const errors = (res as any).errors || res.data?.errors;
        const suggestion = (res as any).suggestions || (res as any).suggestion || res.data?.suggestion || res.data?.suggestions;
        const phoneVal = formData.phone.trim();
        const emailVal = formData.email.trim();

        const phoneError = errors?.phone;
        const emailError = errors?.email;

        const isPhoneDup =
          Boolean(phoneError) ||
          Boolean(suggestion && (suggestion.type === "phone" || suggestion.url?.includes("phone") || suggestion.login_url?.includes("phone"))) ||
          Boolean(typeof res.message === "string" && res.message.toLowerCase().includes("số điện thoại"));

        const isEmailDup =
          Boolean(emailError) ||
          Boolean(suggestion && (suggestion.type === "email" || suggestion.url?.includes("email") || suggestion.login_url?.includes("email"))) ||
          Boolean(typeof res.message === "string" && res.message.toLowerCase().includes("email"));

        if (isPhoneDup && isEmailDup) {
          setDuplicateAlert({
            type: "both",
            message: "Số điện thoại và Email này đã được đăng ký tài khoản.",
            loginUrl: `/login?phone=${encodeURIComponent(phoneVal)}`,
            forgotUrl: `/forgot-password?phone=${encodeURIComponent(phoneVal)}`,
          });
          setError(null);
        } else if (isPhoneDup) {
          const rawMsg = Array.isArray(phoneError) ? phoneError[0] : (typeof phoneError === "string" ? phoneError : null);
          setDuplicateAlert({
            type: "phone",
            message: rawMsg || suggestion?.message || "Số điện thoại này đã được đăng ký tài khoản.",
            loginUrl: suggestion?.login_url || suggestion?.url || `/login?phone=${encodeURIComponent(phoneVal)}`,
            forgotUrl: suggestion?.forgot_url || `/forgot-password?phone=${encodeURIComponent(phoneVal)}`,
          });
          setError(null);
        } else if (isEmailDup) {
          const rawMsg = Array.isArray(emailError) ? emailError[0] : (typeof emailError === "string" ? emailError : null);
          setDuplicateAlert({
            type: "email",
            message: rawMsg || suggestion?.message || "Email này đã được đăng ký tài khoản.",
            loginUrl: suggestion?.login_url || suggestion?.url || `/login?email=${encodeURIComponent(emailVal)}`,
            forgotUrl: suggestion?.forgot_url || `/forgot-password?email=${encodeURIComponent(emailVal)}`,
          });
          setError(null);
        } else if (suggestion) {
          setDuplicateAlert({
            type: "phone",
            message: suggestion.message || res.message || "Thông tin này đã được đăng ký tài khoản.",
            loginUrl: suggestion.login_url || suggestion.url || `/login?phone=${encodeURIComponent(phoneVal)}`,
            forgotUrl: suggestion.forgot_url || `/forgot-password?phone=${encodeURIComponent(phoneVal)}`,
          });
          setError(null);
        } else {
          setDuplicateAlert(null);
          setError(res.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
        }
      }
    } catch (err: any) {
      const errors = err?.response?.data?.errors || err?.errors;
      const suggestion = err?.response?.data?.suggestion || err?.response?.data?.suggestions || err?.suggestion || err?.suggestions;
      const phoneVal = formData.phone.trim();
      const emailVal = formData.email.trim();

      const phoneError = errors?.phone;
      const emailError = errors?.email;

      const isPhoneDup =
        Boolean(phoneError) ||
        Boolean(suggestion && (suggestion.type === "phone" || suggestion.url?.includes("phone") || suggestion.login_url?.includes("phone"))) ||
        Boolean(typeof err?.message === "string" && err.message.toLowerCase().includes("số điện thoại"));

      const isEmailDup =
        Boolean(emailError) ||
        Boolean(suggestion && (suggestion.type === "email" || suggestion.url?.includes("email") || suggestion.login_url?.includes("email"))) ||
        Boolean(typeof err?.message === "string" && err.message.toLowerCase().includes("email"));

      if (isPhoneDup) {
        const rawMsg = Array.isArray(phoneError) ? phoneError[0] : (typeof phoneError === "string" ? phoneError : null);
        setDuplicateAlert({
          type: "phone",
          message: rawMsg || "Số điện thoại này đã được đăng ký tài khoản.",
          loginUrl: suggestion?.login_url || suggestion?.url || `/login?phone=${encodeURIComponent(phoneVal)}`,
          forgotUrl: suggestion?.forgot_url || `/forgot-password?phone=${encodeURIComponent(phoneVal)}`,
        });
        setError(null);
      } else if (isEmailDup) {
        const rawMsg = Array.isArray(emailError) ? emailError[0] : (typeof emailError === "string" ? emailError : null);
        setDuplicateAlert({
          type: "email",
          message: rawMsg || "Email này đã được đăng ký tài khoản.",
          loginUrl: suggestion?.login_url || suggestion?.url || `/login?email=${encodeURIComponent(emailVal)}`,
          forgotUrl: suggestion?.forgot_url || `/forgot-password?email=${encodeURIComponent(emailVal)}`,
        });
        setError(null);
      } else {
        setDuplicateAlert(null);
        setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setOtpError("Vui lòng nhập đúng 6 chữ số mã xác thực OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await verifyEmailApi({
        email: activationEmail,
        otp_code: cleanOtp,
      });

      if (res.token && res.user) {
        loginWithToken(res.token, res.user);
        setOtpSuccess("🎉 Kích hoạt tài khoản thành công! Đang chuyển hướng...");
        setTimeout(() => {
          router.push("/profile");
        }, 1200);
      } else {
        setOtpError(res.message || "Kích hoạt không thành công.");
      }
    } catch (err: any) {
      setOtpError(err.message || "Mã xác thực không chính xác hoặc đã hết hạn.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await resendActivationApi(activationEmail);
      setResendCountdown(60);
      setOtpSuccess(res.message || "Mã kích hoạt mới đã được gửi tới email của bạn!");
    } catch (err: any) {
      setOtpError(err.message || "Không thể gửi lại mã kích hoạt. Vui lòng thử lại sau.");
    } finally {
      setOtpLoading(false);
    }
  };

  // MÀN HÌNH KÍCH HOẠT TÀI KHOẢN (OTP)
  if (isActivating) {
    return (
      <div className="flex flex-col gap-5 w-full">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-2">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-primary font-display leading-tight tracking-[0.01em]">
            Kích hoạt tài khoản
          </h1>
          <p className="text-gray-600 max-w-[380px] mx-auto text-sm leading-relaxed">
            Chúng tôi đã gửi mã xác thực 6 chữ số tới email: <br />
            <span className="font-bold text-primary">{activationEmail}</span>
          </p>
          <p className="text-xs text-gray-500 italic">
            (Vui lòng kiểm tra cả hòm thư đến và thư rác - Spam/Junk)
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <div className="space-y-1.5 text-center">
            <label className="text-xs uppercase tracking-wider text-gray-600 font-bold block">
              Nhập mã OTP 6 chữ số
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

          {otpSuccess && (
            <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-medium text-center p-3 rounded-xl animate-in fade-in">
              {otpSuccess}
            </div>
          )}

          {otpError && (
            <div className="text-red-700 bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-center p-3 rounded-xl animate-in fade-in">
              {otpError}
            </div>
          )}

          <button
            type="submit"
            disabled={otpLoading || otpCode.trim().length !== 6}
            className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
              otpLoading || otpCode.trim().length !== 6
                ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
            } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
          >
            {otpLoading ? "Đang xác thực..." : "Kích hoạt tài khoản"}
          </button>

          <div className="flex items-center justify-between text-xs text-gray-600 pt-2 px-1">
            <span>Chưa nhận được mã?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0 || otpLoading}
              className={`font-bold transition-all ${
                resendCountdown > 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-secondary hover:underline cursor-pointer"
              }`}
            >
              {resendCountdown > 0 ? `Gửi lại sau (${resendCountdown}s)` : "Gửi lại mã kích hoạt"}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsActivating(false);
                setOtpError(null);
                setOtpSuccess(null);
              }}
              className="text-xs text-gray-500 hover:text-primary transition-colors font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>←</span>
              <span>Quay lại form đăng ký</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // MÀN HÌNH ĐĂNG KÝ
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      {/* Title & Subtitle */}
      <div className="text-center space-y-1.5">
        <h1 className="text-[28px] md:text-[32px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
          {t("title")}
        </h1>
        <p className="text-sm text-gray-600 max-w-[400px] mx-auto">
          {t("description")}
        </p>
      </div>

      {/* Banner cảnh báo thông minh khi SĐT hoặc Email đã được đăng ký (API 422 hoặc Suggestions) */}
      {duplicateAlert && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-left shadow-sm space-y-3 animate-in fade-in transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700 text-base">
              ⚠️
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] sm:text-[15px] font-bold text-amber-900 leading-snug">
                {duplicateAlert.message}
              </h3>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                Tài khoản với thông tin này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc khôi phục mật khẩu nếu bạn không nhớ thông tin.
              </p>
            </div>
          </div>

          {/* 2 nút bấm điều hướng trực tiếp */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
            <Link
              href={duplicateAlert.loginUrl as any}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl bg-secondary text-white text-xs sm:text-sm font-bold hover:bg-secondary/90 active:scale-98 transition-all shadow-xs text-center min-h-[38px] cursor-pointer"
            >
              Đăng nhập ngay
            </Link>
            <Link
              href={duplicateAlert.forgotUrl as any}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold hover:bg-amber-100/70 active:scale-98 transition-all shadow-xs text-center min-h-[38px] cursor-pointer"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-3">
        {/* Full Name */}
        <div className="space-y-1 text-left">
          <label className="text-sm text-primary font-semibold block">
            {t("name")}
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder={t("name_placeholder")}
            className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[40px] text-gray-900"
          />
        </div>

        {/* Email */}
        <div className="space-y-1 text-left">
          <label className="text-sm text-primary font-semibold block">
            {t("email")}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder={t("email_placeholder")}
            className={`input-form w-full rounded-[12px] border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-1 h-[40px] text-gray-900 ${
              emailAvailability?.exists
                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-400"
                : "border-gray-300 focus:border-primary focus:ring-primary"
            }`}
          />
          {/* Banner gợi ý thông minh khi Email trùng */}
          {emailAvailability?.exists && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 animate-in fade-in">
              <p className="font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Email này đã được đăng ký tài khoản.</span>
              </p>
              <p>
                Bạn có muốn{" "}
                <Link
                  href={{ pathname: "/signin", query: { email: formData.email } } as any}
                  className="text-secondary font-bold underline hover:text-secondary/80"
                >
                  Đăng nhập
                </Link>{" "}
                hoặc{" "}
                <Link
                  href={{ pathname: "/forgot-password", query: { email: formData.email } } as any}
                  className="text-secondary font-bold underline hover:text-secondary/80"
                >
                  Quên mật khẩu
                </Link>
                ?
              </p>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1 text-left">
          <label className="text-sm text-primary font-semibold block">
            {t("phone")}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder={t("phone_placeholder")}
            className={`input-form w-full rounded-[12px] border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-1 h-[40px] text-gray-900 ${
              phoneAvailability?.exists
                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-400"
                : "border-gray-300 focus:border-primary focus:ring-primary"
            }`}
          />
          {/* Banner gợi ý thông minh khi SĐT trùng */}
          {phoneAvailability?.exists && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 animate-in fade-in">
              <p className="font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Số điện thoại này đã được đăng ký tài khoản.</span>
              </p>
              <p>
                Bạn có muốn{" "}
                <Link
                  href={{ pathname: "/signin", query: { phone: formData.phone } } as any}
                  className="text-secondary font-bold underline hover:text-secondary/80"
                >
                  Đăng nhập
                </Link>{" "}
                hoặc{" "}
                <Link
                  href={{ pathname: "/forgot-password", query: { phone: formData.phone } } as any}
                  className="text-secondary font-bold underline hover:text-secondary/80"
                >
                  Quên mật khẩu
                </Link>
                ?
              </p>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1 text-left relative">
          <label className="text-sm text-primary font-semibold block">
            {t("password")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t("password_placeholder")}
              className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[40px] text-gray-900 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none text-xs cursor-pointer"
            >
              {showPassword ? t("hide_password") : t("show_password")}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-center p-2.5 rounded-xl">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
          loading
            ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
            : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
        } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
      >
        {loading ? "..." : t("button")}
      </button>

      {/* Google Login Option */}
      <div className="relative my-1 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300/60"></div>
        </div>
        <span className="relative bg-yellow px-3.5 text-xs font-semibold uppercase text-gray-500 rounded-full">
          {t("or")}
        </span>
      </div>

      <div
        id="google-signin-btn-register"
        className="w-full flex justify-center min-h-[44px]"
      ></div>

      {/* Footer Links */}
      <div className="text-center text-[14px] leading-[150%] text-gray-700 flex justify-center gap-1.5 mt-1">
        <span>{t("already_have_account")}</span>
        <Link href="/signin" className="text-secondary font-bold hover:underline transition-all">
          {t("login_now")}
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm;
