"use client";

import ScrollRestoration from "@/components/ScrollRestoration";
import { AuthProvider } from "@/contexts/AuthContext";

// Providers for client-side functionality can be added here
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScrollRestoration />
      {children}
    </AuthProvider>
  );
}
