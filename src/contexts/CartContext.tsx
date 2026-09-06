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

  const [productsCache, setProductsCache] = useState<any[]>([]);

  // Fetch products once to power dynamic price calculation
  useEffect(() => {
    if (!isLoaded) return;
    fetch("/api/products?per_page=all")
      .then((res) => res.json())
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          setProductsCache(res.data);
        }
      })
      .catch(() => {});
  }, [isLoaded]);

  // Dynamic price evaluation based on subtotal and campaign conditions
  useEffect(() => {
    if (!isLoaded || productsCache.length === 0 || cartItems.length === 0) return;

    // 1. Calculate gross subtotal (using base prices)
    const grossSubtotal = cartItems.reduce((sum, item) => {
      const p = productsCache.find(x => x.id === item.productId || x.kiotviet_id === item.productId || x.slug === item.slug);
      let basePrice = item.originalPrice || item.unitPrice;
      if (p) {
        if (p.variants && p.variants.length > 0) {
          const v = p.variants.find((vObj: any) => vObj.size === item.variant || vObj.id === item.productId || vObj.kiotviet_id === item.productId);
          if (v) basePrice = parseFloat(String(v.original_price || v.price || 0));
        } else if (p.original_price || p.price) {
          basePrice = parseFloat(String(p.original_price || p.price));
        }
      }
      return sum + basePrice * item.quantity;
    }, 0);

    // 2. Re-evaluate prices for all items
    let changed = false;
    const updated = cartItems.map((item) => {
      const p = productsCache.find(
        (x: any) => x.id === item.productId || x.kiotviet_id === item.productId || x.slug === item.slug
      );
      if (!p) return item;

      let origPrice: number | undefined = undefined;
      let currentPrice: number | undefined = undefined;

      const evaluateCampaign = (campaignPrice: any, campaignObj: any, base: number) => {
        const cPrice = campaignPrice !== null && campaignPrice !== undefined ? parseFloat(String(campaignPrice)) : null;
        if (cPrice && cPrice < base) {
          const minOrder = campaignObj?.min_order_value ? parseFloat(String(campaignObj.min_order_value)) : 0;
          if (grossSubtotal >= minOrder) {
            return cPrice;
          }
        }
        return null;
      };

      if (p.variants && p.variants.length > 0) {
        const v = p.variants.find(
          (vObj: any) => vObj.size === item.variant || vObj.id === item.productId || vObj.kiotviet_id === item.productId
        );
        if (v) {
          const vBase = parseFloat(String(v.original_price || v.price || 0));
          const activeCampaign = v.active_campaign || p.active_campaign;
          const vCamp = evaluateCampaign(v.campaign_price, activeCampaign, vBase);
          
          if (vCamp) {
            origPrice = vBase;
            currentPrice = vCamp;
          } else if (vBase > 0) {
            currentPrice = vBase;
            origPrice = vBase;
          }
        }
      }

      if (!origPrice && p.original_price && p.price) {
        const pBase = parseFloat(String(p.original_price));
        const activeCampaign = p.active_campaign;
        const pPrice = evaluateCampaign(p.campaign_price, activeCampaign, pBase);
        
        if (pPrice) {
          origPrice = pBase;
          currentPrice = pPrice;
        } else {
          currentPrice = pBase;
          origPrice = pBase;
        }
      }

      const newUnit = currentPrice || item.unitPrice;
      const newOrig = origPrice && origPrice > newUnit ? origPrice : newUnit;

      if (item.unitPrice !== newUnit || item.originalPrice !== newOrig) {
        changed = true;
        return {
          ...item,
          unitPrice: newUnit,
          originalPrice: newOrig,
        };
      }
      return item;
    });

    if (changed) {
      setCartItems(updated);
    }
  }, [isLoaded, productsCache, cartItems]);

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
