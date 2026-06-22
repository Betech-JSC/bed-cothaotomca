"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/i18n-navigation";

type LoginFormProps = {
  onLoginSuccess?: () => void;
};

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const t = useTranslations("signin");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Logic for authentication can be integrated here
      // For now, we simulate a successful login or a simple delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      {/* Title & Subtitle */}
      <div className="text-center space-y-2">
        <h1 className="text-[32px] md:text-[36px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
          {t("title")}
        </h1>
        <p className="body-2 text-gray-700/80 font-serif max-w-[400px] mx-auto">
          {t("description")}
        </p>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-4">
        {/* Username / Email / Phone */}
        <div className="space-y-1.5 text-left">
          <label className="body-2 text-primary font-semibold block font-serif">
            {t("email_phone")}
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            placeholder={t("email_phone_placeholder")}
            className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left relative">
          <label className="body-2 text-primary font-semibold block font-serif">
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
              className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none text-xs font-serif"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-sm font-serif text-center bg-red-50 p-2 rounded-lg">
          {error}
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
        {loading ? "..." : t("button")}
      </button>

      {/* Footer Links */}
      <div className="text-center font-serif text-[14px] leading-[150%] text-gray-700 flex justify-between px-2">
        <Link href="/forgot-password" className="text-primary hover:underline hover:text-secondary transition-all">
          {t("forgot_password")}
        </Link>
        <Link href="/signup" className="text-secondary font-bold hover:underline transition-all">
          {t("register_now")}
        </Link>
      </div>
    </form>
  );
};

export default LoginForm;
