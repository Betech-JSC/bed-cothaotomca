"use client";

import ScrollRestoration from "@/components/ScrollRestoration";
import PasswordGate from "@/components/Common/PasswordGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { AlternateLinksProvider } from "@/contexts/AlternateLinksContext";

// Providers for client-side functionality can be added here
export function Providers({ children }: { children: React.ReactNode }) {
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

