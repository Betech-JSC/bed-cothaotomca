"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string; // unique identifier (productId + variant)
  productId: number;
  productCode: string;
  slug: string;
  categorySlug: string;
  title: string;
  imageUrl: string;
  variant: string; // size variant, e.g. "Size S"
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  note?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage after mount to prevent SSR hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cothaotomca_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validItems = parsed.filter(
            (item) => item && item.productId && typeof item.productId === "number"
          );
          setCartItems(validItems);
          if (validItems.length !== parsed.length) {
            localStorage.setItem("cothaotomca_cart", JSON.stringify(validItems));
          }
        } else {
          setCartItems([]);
        }
      }
    } catch (e) {
      console.error("Error loading cart from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("cothaotomca_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Error saving cart to localStorage", e);
    }
  }, [cartItems, isLoaded]);

  // Auto-enrich originalPrice and prices for existing cart items from API if missing
  useEffect(() => {
    if (!isLoaded || cartItems.length === 0) return;
    const needsEnrichment = cartItems.some((i) => i.originalPrice === undefined);
    if (!needsEnrichment) return;

    fetch("/api/products?per_page=all")
      .then((res) => res.json())
      .then((res) => {
        const products = res.data || [];
        if (!Array.isArray(products) || products.length === 0) return;

        setCartItems((prev) => {
          let changed = false;
          const updated = prev.map((item) => {
            if (item.originalPrice !== undefined) return item;
            const p = products.find(
              (x: any) =>
                x.id === item.productId ||
                x.kiotviet_id === item.productId ||
                x.slug === item.slug
            );
            if (!p) return item;

            let origPrice: number | undefined = undefined;
            let currentPrice: number | undefined = undefined;

            if (p.variants && p.variants.length > 0) {
              const v = p.variants.find(
                (vObj: any) =>
                  vObj.size === item.variant ||
                  vObj.id === item.productId ||
                  vObj.kiotviet_id === item.productId
              );
              if (v) {
                const vBase = parseFloat(String(v.original_price || v.price || 0));
                const vCamp =
                  v.campaign_price !== null && v.campaign_price !== undefined
                    ? parseFloat(String(v.campaign_price))
                    : null;
                if (vCamp && vCamp < vBase) {
                  origPrice = vBase;
                  currentPrice = vCamp;
                } else if (vBase > 0) {
                  currentPrice = vBase;
                }
              }
            }

            if (!origPrice && p.original_price && p.price) {
              const pBase = parseFloat(String(p.original_price));
              const pPrice = parseFloat(String(p.campaign_price || p.price));
              if (pBase > pPrice) {
                origPrice = pBase;
                currentPrice = pPrice;
              }
            }

            if (origPrice && origPrice > (currentPrice || item.unitPrice)) {
              changed = true;
              return {
                ...item,
                unitPrice: currentPrice || item.unitPrice,
                originalPrice: origPrice,
              };
            }
            return item;
          });
          return changed ? updated : prev;
        });
      })
      .catch(() => {});
  }, [isLoaded, cartItems]);

  const addToCart = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
