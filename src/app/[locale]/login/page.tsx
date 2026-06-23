"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations();
  const { user, login, loginWithGoogle, loading } = useAuth();
  const router = useRouter();
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/profile");
    }
  }, [user, loading, router]);

  // Google Sign-In initialization
  useEffect(() => {
    if (loading || user || typeof window === "undefined") return;

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
      setSubmitting(true);
      setError(null);
      const res = await loginWithGoogle(response.credential);
      setSubmitting(false);

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
  }, [loading, user, loginWithGoogle, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError("Vui lòng điền đầy đủ số điện thoại và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await login(phone, password);
    setSubmitting(false);

    if (res.success) {
      router.push("/profile");
    } else {
      setError(res.message || "Thông tin đăng nhập không chính xác.");
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-[600px] items-center justify-center bg-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[700px] items-center justify-center bg-primary px-4 py-16">
      {/* Background blobs for premium depth */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-secondary/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-yellow/10 blur-[100px]" />

      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">Đăng Nhập Thành Viên</h2>
          <p className="mt-2 text-sm text-gray-300">Tích lũy điểm thố thưởng cho mỗi bữa ăn ngon!</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/30 p-3.5 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Số điện thoại</label>
            <input
              type="tel"
              placeholder="Ví dụ: 0987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Mật khẩu</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn btn-secondary !py-3 font-bold hover:shadow-lg transition-shadow duration-300"
          >
            {submitting ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative bg-[#1c306b] px-4 text-xs font-semibold uppercase text-gray-300 rounded-full">
            Hoặc
          </span>
        </div>

        <div 
          id="google-signin-btn" 
          className="w-full flex justify-center min-h-[44px]"
        ></div>

        <div className="mt-8 text-center text-sm text-gray-400">
          Chưa có tài khoản thành viên?{" "}
          <Link href="/register" className="font-semibold text-yellow hover:text-secondary hover:underline transition-colors">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
