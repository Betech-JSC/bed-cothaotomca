"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations();
  const { user, register, loginWithGoogle, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<boolean | null>(null);
  
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
            width: btnElement.clientWidth || 448,
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
    if (!name || !phone || !password) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc (*).");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải dài ít nhất 6 ký tự.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      password,
      email: email.trim() || undefined,
      dob: dob || undefined,
      gender: gender !== null ? gender : undefined,
    };

    const res = await register(payload);
    setSubmitting(false);

    if (res.success) {
      router.push("/profile");
    } else {
      setError(res.message || "Đăng ký không thành công. Số điện thoại đã được đăng ký.");
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
    <div className="relative flex min-h-[800px] items-center justify-center bg-primary px-4 py-16">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-secondary/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-yellow/10 blur-[100px]" />

      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">Đăng Ký Thành Viên</h2>
          <p className="mt-2 text-sm text-gray-300">
            Nếu bạn đã mua hàng tại quầy trước đây, hãy đăng ký bằng chính số điện thoại cũ để liên kết điểm tích lũy hiện tại!
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/30 p-3.5 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Họ tên *</label>
              <input
                type="text"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Số điện thoại *</label>
              <input
                type="tel"
                placeholder="Ví dụ: 0987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Mật khẩu *</label>
              <input
                type="password"
                placeholder="Mật khẩu tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Email (Không bắt buộc)</label>
              <input
                type="email"
                placeholder="partner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Ngày sinh (Không bắt buộc)</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white placeholder:text-gray-500 focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">Giới tính (Không bắt buộc)</label>
              <select
                value={gender === null ? "" : gender ? "true" : "false"}
                onChange={(e) => {
                  const val = e.target.value;
                  setGender(val === "" ? null : val === "true" ? true : false);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 px-4 text-white focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
              >
                <option value="" className="text-gray-900 bg-primary">Không xác định</option>
                <option value="true" className="text-gray-900 bg-primary">Nam</option>
                <option value="false" className="text-gray-900 bg-primary">Nữ</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn btn-secondary !py-3.5 font-bold hover:shadow-lg transition-shadow duration-300"
            >
              {submitting ? "Đang xử lý..." : "Đăng Ký Thành Viên"}
            </button>
          </div>
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
          Đã có tài khoản thành viên?{" "}
          <Link href="/login" className="font-semibold text-yellow hover:text-secondary hover:underline transition-colors">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
