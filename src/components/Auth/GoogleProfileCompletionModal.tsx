"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const VIETNAM_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export default function GoogleProfileCompletionModal() {
  const { user, token, completeGoogleProfile } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if profile setup is required
  const needsPhoneSetup = Boolean(
    token && user && (!user.phone || user.phone.trim() === "" || (user as any).require_phone_setup)
  );

  // Reset form when modal opens
  useEffect(() => {
    if (needsPhoneSetup) {
      setPhone("");
      setPassword("");
      setPasswordConfirmation("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [needsPhoneSetup]);

  if (!needsPhoneSetup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim().replace(/\s+/g, "");

    if (!cleanPhone) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!VIETNAM_PHONE_REGEX.test(cleanPhone)) {
      setError("Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng số điện thoại Việt Nam (ví dụ: 0912345678).");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    if (passwordConfirmation && password !== passwordConfirmation) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await completeGoogleProfile({
        phone: cleanPhone,
        password,
        password_confirmation: passwordConfirmation || password,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Hoàn thiện hồ sơ thành công!");
      } else {
        setError(res.message || "Cập nhật thông tin thất bại. Vui lòng kiểm tra lại.");
      }
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra trong quá trình cập nhật.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Strict backdrop (cannot be closed by clicking outside because phone is mandatory) */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-[480px] bg-white rounded-[28px] p-6 sm:p-8 md:p-10 shadow-2xl z-10 animate-in zoom-in-95 duration-300 border border-gray-100 font-sans">
        {/* Header Icon */}
        <div className="mx-auto size-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4">
          <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-primary">
            Hoàn Thiện Hồ Sơ Tài Khoản
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Chào mừng bạn đến với <strong>Cô Thảo Tôm Cá</strong>! Vui lòng cung cấp số điện thoại để đồng bộ tích điểm thành viên và thiết lập mật khẩu bảo mật.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs sm:text-sm font-medium animate-in fade-in">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Field */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-gray-800 block">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base md:text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-gray-400 font-medium"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-gray-800 block">
              Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                minLength={6}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base md:text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-gray-400 font-medium pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-bold text-gray-800 block">
              Xác nhận mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Nhập lại mật khẩu..."
              minLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base md:text-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`btn btn-secondary w-full py-3.5 mt-2 font-bold tracking-wide rounded-full text-white shadow-md active:scale-95 transition-all ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Đang xử lý..." : "Hoàn Tất Hồ Sơ"}
          </button>
        </form>
      </div>
    </div>
  );
}
