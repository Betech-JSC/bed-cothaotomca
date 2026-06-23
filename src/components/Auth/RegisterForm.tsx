"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/i18n-navigation";
import { useAuth } from "@/contexts/AuthContext";

const RegisterForm = () => {
  const t = useTranslations("signup");
  const { register } = useAuth();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      if (res.success) {
        router.push("/profile");
      } else {
        setError(res.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      {/* Title & Subtitle */}
      <div className="text-center space-y-1.5">
        <h1 className="text-[28px] md:text-[32px] font-bold text-primary font-display leading-[120%] tracking-[0.02em]">
          {t("title")}
        </h1>
        <p className="body-2 text-gray-700/80 font-serif max-w-[400px] mx-auto">
          {t("description")}
        </p>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-3">
        {/* Full Name */}
        <div className="space-y-1 text-left">
          <label className="body-2 text-primary font-semibold block font-serif">
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
          <label className="body-2 text-primary font-semibold block font-serif">
            {t("email")}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder={t("email_placeholder")}
            className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[40px] text-gray-900"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1 text-left">
          <label className="body-2 text-primary font-semibold block font-serif">
            {t("phone")}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder={t("phone_placeholder")}
            className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[40px] text-gray-900"
          />
        </div>

        {/* Password */}
        <div className="space-y-1 text-left relative">
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
              className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[40px] text-gray-900 pr-10"
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
      <div className="text-center font-serif text-[14px] leading-[150%] text-gray-700 flex justify-center gap-1.5 mt-1">
        <span>{t("already_have_account")}</span>
        <Link href="/signin" className="text-secondary font-bold hover:underline transition-all">
          {t("login_now")}
        </Link>
      </div>
    </form>
  );
};

export default RegisterForm;
