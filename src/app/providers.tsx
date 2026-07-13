"use client";

import ScrollRestoration from "@/components/ScrollRestoration";

// Providers for client-side functionality can be added here
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollRestoration />
      {children}
    </>
  );
}
