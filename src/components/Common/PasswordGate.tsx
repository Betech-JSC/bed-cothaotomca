"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const SITE_PASSWORD = process.env.NEXT_PUBLIC_SITE_PASSWORD || "cothaotomca2026";

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const hasCookie =
        typeof document !== "undefined" &&
        document.cookie
          .split("; ")
          .some((row) => row.startsWith("site_access_token=granted"));
      const hasLocalStorage =
        typeof window !== "undefined" &&
        localStorage.getItem("site_access_token") === "granted";

      if (hasCookie || hasLocalStorage) {
        setIsUnlocked(true);
      }
    } catch {
      // Storage access fallback
    } finally {
      setIsMounted(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (password.trim() === SITE_PASSWORD) {
      try {
        document.cookie =
          "site_access_token=granted; path=/; max-age=2592000; SameSite=Lax";
        localStorage.setItem("site_access_token", "granted");
      } catch {
        // Storage access fallback
      }
      setIsUnlocked(true);
    } else {
      setError("Mật mã không chính xác. Vui lòng kiểm tra lại!");
    }
    setIsSubmitting(false);
  };

  // If already unlocked and client is mounted, render children
  if (isMounted && isUnlocked) {
    return <>{children}</>;
  }

  // Otherwise, lock screen protects the entire site. Children are NEVER rendered.
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center min-h-screen bg-[#0a1128] overflow-y-auto p-4 sm:p-6 select-none font-sans">
      {/* Background with luxury seafood brand style */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: "url('/images/bg-login.jpg')" }}
        aria-hidden="true"
      />
      {/* Dark luxury navy gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/95 via-[#142A68]/90 to-[#060c1d]/98 backdrop-blur-md"
        aria-hidden="true"
      />

      {/* Ambient glowing radial effects */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CD4829]/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Lock Card */}
      <div className="relative z-10 w-full max-w-[460px] bg-[#142A68]/85 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo.png"
            alt="Cô Thảo Tôm Cá"
            width={160}
            height={70}
            className="h-16 w-auto object-contain drop-shadow-md"
            priority
          />
        </div>

        {/* Lock Security Badge */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#CD4829]/20 border border-[#CD4829]/40 flex items-center justify-center text-[#CD4829] mb-4 shadow-lg shadow-[#CD4829]/25">
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Titles */}
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-display leading-snug mb-2">
          TRANG WEB ĐANG TRONG GIAI ĐOẠN THỬ NGHIỆM NỘI BỘ
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 mb-6 font-normal">
          Vui lòng nhập mật mã để truy cập
        </p>

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-200 tracking-wider uppercase block">
              Mật mã truy cập
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Nhập mật mã..."
                autoFocus
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-[#CD4829] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#CD4829]/30 transition-all pr-12 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white p-1 focus:outline-none transition-colors cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#CD4829] hover:bg-[#b83c1f] text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-[#CD4829]/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            <span>Mở khóa truy cập</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-400">
          <span>Hệ thống bảo vệ nội bộ &copy; Cô Thảo Tôm Cá</span>
        </div>
      </div>
    </div>
  );
}
