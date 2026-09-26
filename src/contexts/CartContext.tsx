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
  isOutOfStock?: boolean;
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
  hasOutOfStockItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function checkItemOutOfStock(item: CartItem, cache: any[]): boolean {
  if (!item.productCode || !item.productCode.trim()) return true;
  if (!cache || cache.length === 0) return Boolean(item.isOutOfStock ?? false);

  let p = cache.find(
    (x: any) =>
      Number(x.id) === Number(item.productId) ||
      Number(x.kiotviet_id) === Number(item.productId) ||
      (x.slug && x.slug === item.slug) ||
      (x.code && x.code === item.productCode)
  );
  if (!p) {
    p = cache.find(
      (x: any) =>
        x.variants &&
        x.variants.some(
          (v: any) =>
            Number(v.id) === Number(item.productId) ||
            Number(v.kiotviet_id) === Number(item.productId) ||
            (v.code && v.code === item.productCode)
        )
    );
  }
  if (!p) return Boolean(item.isOutOfStock ?? false);

  if (p.variants && p.variants.length > 0) {
    const v = p.variants.find(
      (vObj: any) =>
        vObj.size === item.variant ||
        Number(vObj.id) === Number(item.productId) ||
        Number(vObj.kiotviet_id) === Number(item.productId) ||
        (vObj.code && vObj.code === item.productCode)
    );
    if (v) {
      if (!v.code || !v.code.trim()) return true;
      return false;
    }
    if (!p.code || !p.code.trim()) return true;
    return false;
  }

  if (!p.code || !p.code.trim()) return true;
  return false;
}

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
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://cms.cothaotomca.vn/api/v1").replace(/\/$/, "");
    fetch(`${API_BASE}/products?per_page=all`, {
      headers: {
        Accept: "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status}`);
        }
        return res.json();
      })
      .then((res) => {
        if (res && res.data && Array.isArray(res.data)) {
          setProductsCache(res.data);
        } else if (Array.isArray(res)) {
          setProductsCache(res);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch products for CartContext cache:", err);
      });
  }, [isLoaded]);

  // Dynamic price and stock evaluation based on subtotal and campaign conditions
  useEffect(() => {
    if (!isLoaded || productsCache.length === 0 || cartItems.length === 0) return;

    // 1. Calculate gross subtotal (using base prices of in-stock items)
    const grossSubtotal = cartItems.reduce((sum, item) => {
      const isOut = checkItemOutOfStock(item, productsCache);
      if (isOut) return sum;
      let p = productsCache.find(
        (x: any) =>
          Number(x.id) === Number(item.productId) ||
          Number(x.kiotviet_id) === Number(item.productId) ||
          (x.slug && x.slug === item.slug) ||
          (x.code && x.code === item.productCode)
      );
      if (!p) {
        p = productsCache.find((x: any) =>
          x.variants &&
          x.variants.some(
            (v: any) =>
              Number(v.id) === Number(item.productId) ||
              Number(v.kiotviet_id) === Number(item.productId) ||
              (v.code && v.code === item.productCode)
          )
        );
      }
      let basePrice = item.originalPrice || item.unitPrice;
      if (p) {
        if (p.variants && p.variants.length > 0) {
          const v = p.variants.find(
            (vObj: any) =>
              vObj.size === item.variant ||
              Number(vObj.id) === Number(item.productId) ||
              Number(vObj.kiotviet_id) === Number(item.productId) ||
              (vObj.code && vObj.code === item.productCode)
          );
          if (v) basePrice = parseFloat(String(v.original_price || v.price || 0));
        } else if (p.original_price || p.price) {
          basePrice = parseFloat(String(p.original_price || p.price));
        }
      }
      return sum + basePrice * item.quantity;
    }, 0);

    // 2. Re-evaluate prices and stock for all items
    let changed = false;
    const updated = cartItems.map((item) => {
      const isOut = checkItemOutOfStock(item, productsCache);
      let p = productsCache.find(
        (x: any) =>
          Number(x.id) === Number(item.productId) ||
          Number(x.kiotviet_id) === Number(item.productId) ||
          (x.slug && x.slug === item.slug) ||
          (x.code && x.code === item.productCode)
      );
      if (!p) {
        p = productsCache.find((x: any) =>
          x.variants &&
          x.variants.some(
            (v: any) =>
              Number(v.id) === Number(item.productId) ||
              Number(v.kiotviet_id) === Number(item.productId) ||
              (v.code && v.code === item.productCode)
          )
        );
      }
      if (!p) {
        if (item.isOutOfStock !== isOut) {
          changed = true;
          return { ...item, isOutOfStock: isOut };
        }
        return item;
      }

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

      let matchedVariant = false;
      if (p.variants && p.variants.length > 0) {
        const v = p.variants.find(
          (vObj: any) => vObj.size === item.variant || vObj.id === item.productId || vObj.kiotviet_id === item.productId || vObj.code === item.productCode
        );
        if (v) {
          matchedVariant = true;
          const vOrig = v.original_price ? parseFloat(String(v.original_price)) : 0;
          const vPrice = v.price ? parseFloat(String(v.price)) : 0;
          const vBase = vOrig > 0 ? vOrig : vPrice;
          const activeCampaign = v.active_campaign || p.active_campaign;
          const vCamp = evaluateCampaign(v.campaign_price, activeCampaign, vBase);
          
          if (vCamp) {
            origPrice = vBase;
            currentPrice = vCamp;
          } else if (vOrig > 0 && vPrice > 0 && vPrice < vOrig) {
            origPrice = vOrig;
            currentPrice = vPrice;
          } else {
            currentPrice = vPrice > 0 ? vPrice : (vBase > 0 ? vBase : undefined);
            origPrice = undefined;
          }
        }
      }

      if (!matchedVariant && (p.original_price || p.price)) {
        const pOrig = p.original_price ? parseFloat(String(p.original_price)) : 0;
        const pPriceVal = p.price ? parseFloat(String(p.price)) : 0;
        const pBase = pOrig > 0 ? pOrig : pPriceVal;
        const activeCampaign = p.active_campaign;
        const pCamp = evaluateCampaign(p.campaign_price, activeCampaign, pBase);
        
        if (pCamp) {
          origPrice = pBase;
          currentPrice = pCamp;
        } else if (pOrig > 0 && pPriceVal > 0 && pPriceVal < pOrig) {
          origPrice = pOrig;
          currentPrice = pPriceVal;
        } else {
          currentPrice = pPriceVal > 0 ? pPriceVal : (pBase > 0 ? pBase : undefined);
          origPrice = undefined;
        }
      }

      const newUnit = currentPrice || item.unitPrice;
      const newOrig = origPrice && origPrice > newUnit ? origPrice : newUnit;

      if (item.unitPrice !== newUnit || item.originalPrice !== newOrig || item.isOutOfStock !== isOut) {
        changed = true;
        return {
          ...item,
          unitPrice: newUnit,
          originalPrice: newOrig,
          isOutOfStock: isOut,
        };
      }
      return item;
    });

    if (changed) {
      setCartItems(updated);
    }
  }, [isLoaded, productsCache, cartItems]);

  const addToCart = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    const isOutOfStock = checkItemOutOfStock(item as CartItem, productsCache);
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity, isOutOfStock } : i
        );
      }
      return [...prev, { ...item, quantity, isOutOfStock }];
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
  const subtotal = cartItems.reduce((sum, item) => {
    if (item.isOutOfStock) return sum;
    return sum + item.unitPrice * item.quantity;
  }, 0);
  const hasOutOfStockItems = cartItems.some((item) => item.isOutOfStock);

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
        hasOutOfStockItems,
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
