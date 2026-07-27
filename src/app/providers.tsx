"use client";

import ScrollRestoration from "@/components/ScrollRestoration";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

// Providers for client-side functionality can be added here
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ScrollRestoration />
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
