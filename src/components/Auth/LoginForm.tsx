"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useAuth } from "@/contexts/AuthContext";
import { verifyEmailApi, resendActivationApi } from "@/services/authService";

type LoginFormProps = {
  onLoginSuccess?: () => void;
};

const LoginFormContent = ({ onLoginSuccess }: LoginFormProps) => {
  const t = useTranslations("signin");
  const { login, loginWithGoogle, loginWithToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const phoneParam = searchParams?.get("phone") || "";
  const emailParam = searchParams?.get("email") || "";
  const queryUser = phoneParam || emailParam || "";

  const [formData, setFormData] = useState({
    username: queryUser,
    password: "",
  });

  // Sync query parameters if updated dynamically
  useEffect(() => {
    if (queryUser) {
      setFormData((prev) => {
        if (!prev.username || prev.username === queryUser) {
          return { ...prev, username: queryUser };
        }
        return prev;
      });
    }
  }, [queryUser]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Activation modal state for ACCOUNT_PENDING
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resending activation code
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  // Google Sign-In initialization
  useEffect(() => {
    if (loading || typeof window === "undefined") return;

    const initializeGoogle = () => {
      const google = (window as any).google;
      if (google) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
        });

        const btnElement = document.getElementById("google-signin-btn-login");
        if (btnElement) {
          google.accounts.id.renderButton(btnElement, {
            text: "signin_with",
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
      setErrorCode(null);
      const res = await loginWithGoogle(response.credential);
      setLoading(false);

      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          router.push("/profile");
        }
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
  }, [loading, loginWithGoogle, router, onLoginSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await login(formData.username, formData.password);
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          router.push("/profile");
        }
      } else {
        setErrorCode(res.error_code || null);
        if (res.error_code === "ACCOUNT_PENDING") {
          const email = res.data?.email || (formData.username.includes("@") ? formData.username : "");
          setPendingEmail(email);
        }
        setError(res.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      setOtpError("Vui lòng nhập đầy đủ mã OTP 6 chữ số.");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await verifyEmailApi({
        email: pendingEmail.trim(),
        otp_code: cleanOtp,
      });

      if (res.token && res.user) {
        loginWithToken(res.token, res.user);
        setOtpSuccess("🎉 Kích hoạt tài khoản thành công! Đang chuyển hướng...");
        setTimeout(() => {
          setShowActivationModal(false);
          if (onLoginSuccess) {
            onLoginSuccess();
          } else {
            router.push("/profile");
          }
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

  const handleResendActivation = async () => {
    if (resendCountdown > 0 || otpLoading || !pendingEmail.trim()) return;
    setOtpLoading(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await resendActivationApi(pendingEmail.trim());
      setResendCountdown(60);
      setOtpSuccess(res.message || "Mã kích hoạt mới đã được gửi tới email của bạn!");
    } catch (err: any) {
      setOtpError(err.message || "Không thể gửi lại mã kích hoạt.");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5 w-full">
        {/* Title & Subtitle */}
        <div className="text-center space-y-1.5">
          <h1 className="text-[26px] sm:text-[30px] font-bold text-primary font-display leading-tight tracking-[0.01em]">
            {t("title")}
          </h1>
          <p className="text-[13px] text-gray-600 font-sans max-w-[320px] mx-auto leading-snug">
            {t("description")}
          </p>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3.5">
          {/* Username / Email / Phone */}
          <div className="space-y-1 text-left">
            <label className="text-[13px] text-gray-800 font-semibold block">
              {t("email_phone")}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder={t("email_phone_placeholder")}
              className="w-full rounded-[10px] border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[42px] text-gray-900 placeholder:text-gray-400 shadow-sm transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1 text-left relative">
            <div className="flex items-center justify-between">
              <label className="text-[13px] text-gray-800 font-semibold block">
                {t("password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-secondary hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder={t("password_placeholder")}
                className="w-full rounded-[10px] border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[42px] text-gray-900 placeholder:text-gray-400 shadow-sm transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none text-xs cursor-pointer"
              >
                {showPassword ? t("hide_password") : t("show_password")}
              </button>
            </div>
          </div>
        </div>

        {/* ACCOUNT_LOCKED Warning Banner */}
        {errorCode === "ACCOUNT_LOCKED" ? (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-left space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
              <span className="text-base">🚫</span>
              <span>Tài khoản đã bị khóa</span>
            </div>
            <p className="text-xs text-red-600">
              Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hotline để được hỗ trợ.
            </p>
            <div className="pt-1">
              <a
                href="tel:0336298906"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all"
              >
                📞 Hotline: 0336 298 906
              </a>
            </div>
          </div>
        ) : errorCode === "ACCOUNT_PENDING" ? (
          /* ACCOUNT_PENDING Friendly Orange Banner */
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <span className="text-base">⚠️</span>
              <span>Tài khoản chưa được kích hoạt</span>
            </div>
            <p className="text-xs text-amber-700">
              Tài khoản của bạn chưa được kích hoạt. Vui lòng kích hoạt tài khoản qua email để đăng nhập.
            </p>
            <div>
              <button
                type="button"
                onClick={() => setShowActivationModal(true)}
                className="px-4 py-1.5 rounded-full bg-secondary text-white text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer shadow-sm"
              >
                Kích hoạt ngay →
              </button>
            </div>
          </div>
        ) : error ? (
          /* Standard Error Message */
          <div className="text-red-500 text-xs text-center bg-red-50 p-2.5 rounded-lg border border-red-100">
            {error}
          </div>
        ) : null}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base mt-1 ${
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
            {t("or") || "hoặc"}
          </span>
        </div>

        <div
          id="google-signin-btn-login"
          className="w-full flex justify-center min-h-[44px]"
        ></div>

        {/* Footer Links */}
        <div className="text-center text-[13px] sm:text-[14px] text-gray-600 mt-0.5">
          <span>{t("no_account") || "Chưa có tài khoản?"} </span>
          <Link href="/signup" className="text-secondary font-bold hover:underline transition-all">
            {t("register_now")}
          </Link>
        </div>
      </form>

      {/* Modal Kích hoạt tài khoản khi gặp ACCOUNT_PENDING */}
      {showActivationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-[420px] bg-white rounded-[24px] p-6 shadow-2xl space-y-4 border border-gray-100 text-gray-900">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </span>
                <span>Kích hoạt tài khoản</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowActivationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Nhập mã OTP 6 chữ số đã được gửi tới email để kích hoạt tài khoản của bạn:
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">
                  Email tài khoản
                </label>
                <input
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900 shadow-xs"
                />
              </div>

              <div className="space-y-1 text-center pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                  Mã xác thực OTP (6 số)
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
                <div className="text-emerald-800 bg-emerald-50 border border-emerald-200 text-xs font-medium p-2.5 rounded-xl text-center animate-in fade-in">
                  {otpSuccess}
                </div>
              )}

              {otpError && (
                <div className="text-red-700 bg-red-50 border border-red-200 text-xs font-medium p-2.5 rounded-xl text-center animate-in fade-in">
                  {otpError}
                </div>
              )}

              <button
                type="submit"
                disabled={otpLoading || otpCode.trim().length !== 6 || !pendingEmail.trim()}
                className={`w-full btn font-bold h-[44px] rounded-full transition-all duration-300 text-sm sm:text-base ${
                  otpLoading || otpCode.trim().length !== 6 || !pendingEmail.trim()
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-md shadow-secondary/20 hover:shadow-lg cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {otpLoading ? "Đang kích hoạt..." : "Xác nhận kích hoạt"}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                <span>Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={handleResendActivation}
                  disabled={resendCountdown > 0 || otpLoading || !pendingEmail.trim()}
                  className={`font-bold transition-all ${
                    resendCountdown > 0 || !pendingEmail.trim()
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-secondary hover:underline cursor-pointer"
                  }`}
                >
                  {resendCountdown > 0 ? `Gửi lại (${resendCountdown}s)` : "Gửi lại mã OTP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const LoginForm = (props: LoginFormProps) => {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-gray-400 text-sm animate-pulse">
          Đang tải biểu mẫu đăng nhập...
        </div>
      }
    >
      <LoginFormContent {...props} />
    </Suspense>
  );
};

export default LoginForm;
