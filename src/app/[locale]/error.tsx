"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error?.message || "";
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /loading chunk .* failed/i.test(msg) ||
      /failed to fetch dynamically imported module/i.test(msg) ||
      /is not a valid javascript/i.test(msg);

    if (isChunkError) {
      // Dùng sessionStorage để chống vòng lặp reload vô tận
      try {
        const lastReload = sessionStorage.getItem("last_chunk_reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("last_chunk_reload", String(now));
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }
    console.error("Unhandled client error caught by error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-[500px] md:min-h-[700px] flex items-center justify-center bg-yellow/20 p-6 py-12">
      <div className="container max-w-lg mx-auto">
        <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-28 h-20">
              <Image
                src="/images/logo.png"
                alt="Cô Thảo Tôm Cá"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-primary">
              Đã có gián đoạn kết nối
            </h1>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-md mx-auto">
              Hệ thống vừa cập nhật phiên bản mới hoặc kết nối mạng bị gián đoạn.
              Quý khách vui lòng thử tải lại trang hoặc liên hệ hotline để được
              hỗ trợ nhanh nhất.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="btn btn-secondary px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              Tải lại trang
            </button>
            <Link
              href="/"
              className="btn btn-primary px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              Về trang chủ
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-100 text-sm text-gray-600">
            <span>Hotline hỗ trợ: </span>
            <a
              href="tel:02499997122"
              className="font-bold text-secondary hover:underline ml-1"
            >
              024.9999.7122
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
