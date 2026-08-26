"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useAuth } from "@/contexts/AuthContext";

type LoginFormProps = {
  onLoginSuccess?: () => void;
};

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const t = useTranslations("signin");
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        const btnElement = document.getElementById("google-signin-btn");
        if (btnElement) {
          google.accounts.id.renderButton(btnElement, {
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

    try {
      const res = await login(formData.username, formData.password);
      if (res.success) {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setError(res.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            className="w-full rounded-[10px] border border-[#D8D4C8] bg-white px-3.5 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[42px] text-gray-900 placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1 text-left relative">
          <label className="text-[13px] text-gray-800 font-semibold block">
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
              className="w-full rounded-[10px] border border-[#D8D4C8] bg-white px-3.5 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[42px] text-gray-900 placeholder:text-gray-400 shadow-sm transition-all pr-12"
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

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full btn btn-secondary text-white font-bold h-[44px] rounded-full shadow-md hover:shadow-lg transition-all duration-300 mt-1 ${loading ? "opacity-75 cursor-not-allowed" : ""
          }`}
      >
        {loading ? "..." : t("button")}
      </button>

      {/* Footer Links */}
      <div className="text-center text-[13px] sm:text-[14px] text-gray-600 mt-0.5">
        <span>{t("no_account") || "Chưa có tài khoản?"} </span>
        <Link href="/signup" className="text-secondary font-bold hover:underline transition-all">
          {t("register_now")}
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
