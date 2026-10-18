"use client";

import { useEffect } from "react";
import ScrollRestoration from "@/components/ScrollRestoration";
import PasswordGate from "@/components/Common/PasswordGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AlternateLinksProvider } from "@/contexts/AlternateLinksContext";

// Providers for client-side functionality can be added here
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reloadOnce = () => {
      try {
        const last = sessionStorage.getItem("last_chunk_reload");
        const now = Date.now();
        if (!last || now - parseInt(last, 10) > 10000) {
          sessionStorage.setItem("last_chunk_reload", String(now));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    };

    const isChunkMsg = (msg: string, name?: string) =>
      name === "ChunkLoadError" ||
      /loading (css )?chunk .* failed|failed to fetch dynamically imported module|importing a module script failed|unexpected token '<'|is not a valid javascript/i.test(msg);

    const handleChunkError = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) {
        const url = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || "";
        if (url.includes("/_next/static/")) {
          reloadOnce();
          return;
        }
      }
      if (e instanceof ErrorEvent && isChunkMsg(e.message || "", e.error?.name)) {
        reloadOnce();
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      if (isChunkMsg(e.reason?.message || String(e.reason || ""), e.reason?.name)) {
        reloadOnce();
      }
    };

    window.addEventListener("error", handleChunkError, true);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleChunkError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <AlternateLinksProvider>
          <ScrollRestoration />
          <PasswordGate>{children}</PasswordGate>
        </AlternateLinksProvider>
      </CartProvider>
    </AuthProvider>
  );
}


