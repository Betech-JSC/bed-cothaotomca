"use client";

import React, { useEffect } from "react";
import "@/styles/globals.scss";

export default function GlobalError({
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
      /importing a module script failed/i.test(msg) ||
      /is not a valid javascript/i.test(msg);

    if (isChunkError) {
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
    console.error("Unhandled root client error caught by global-error:", error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6 font-sans text-gray-800">
        <div className="max-w-md w-full bg-white rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 text-center space-y-6">
          <div className="flex justify-center">
            <img
              src="/images/logo.png"
              alt="Cô Thảo Tôm Cá"
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-[#14375F]">
              Đã xảy ra sự cố tạm thời
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Trang web vừa được cập nhật hoặc kết nối gián đoạn. Vui lòng tải lại trang để tiếp tục trải nghiệm.
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
              className="px-6 py-3 rounded-full font-bold bg-[#E5532A] text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              Tải lại trang
            </button>
            <a
              href="/"
              className="px-6 py-3 rounded-full font-bold bg-[#14375F] text-white shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              Về trang chủ
            </a>
          </div>

          <div className="pt-4 border-t border-gray-100 text-sm text-gray-600">
            <span>Hỗ trợ đặt hàng: </span>
            <a
              href="tel:02499997122"
              className="font-bold text-[#E5532A] hover:underline"
            >
              024.9999.7122
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
