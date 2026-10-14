"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string; // unique identifier (productId + variant)
  productId: number;
  productCode: string;
  slug: string;
  categorySlug: string;
  title: string;
  title_vi?: string;
  title_en?: string;
  imageUrl: string;
  variant: string; // size variant, e.g. "Size S"
  variant_vi?: string;
  variant_en?: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  note?: string;
  isOutOfStock?: boolean;
  variantId?: number;
  product_variant_id?: number;
  parentProductId?: number;
  parent_product_id?: number;
  product_id?: number | string;
  variant_id?: number | string;
  db_id?: number | string;
  product_db_id?: number | string;
  variant_db_id?: number | string;
  kiotviet_id?: number | string;
  excludeCampaignPrice?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  restoreCampaignItemsToOriginalPrice: (blockedProductIds?: number[]) => void;
  totalItems: number;
  subtotal: number;
  hasOutOfStockItems: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function findProductInCache(item: CartItem, cache: any[]): any {
  if (!cache || cache.length === 0) return undefined;
  let p = cache.find(
    (x: any) =>
      Number(x.id) === Number(item.productId) ||
      Number(x.kiotviet_id) === Number(item.productId) ||
      (item.parentProductId && (Number(x.id) === Number(item.parentProductId) || Number(x.kiotviet_id) === Number(item.parentProductId))) ||
      (item.product_id && (Number(x.id) === Number(item.product_id) || Number(x.kiotviet_id) === Number(item.product_id))) ||
      (item.db_id && Number(x.id) === Number(item.db_id)) ||
      (item.product_db_id && Number(x.id) === Number(item.product_db_id)) ||
      (item.kiotviet_id && (Number(x.id) === Number(item.kiotviet_id) || Number(x.kiotviet_id) === Number(item.kiotviet_id))) ||
      (x.slug && item.slug && x.slug === item.slug) ||
      (x.alternate_slugs?.en?.slug && item.slug && x.alternate_slugs.en.slug === item.slug) ||
      (x.alternate_slugs?.vi?.slug && item.slug && x.alternate_slugs.vi.slug === item.slug) ||
      (Array.isArray(x.translations) && item.slug && x.translations.some((t: any) => t.slug === item.slug)) ||
      (x.code && item.productCode && x.code === item.productCode)
  );
  if (!p) {
    p = cache.find(
      (x: any) =>
        x.variants &&
        x.variants.some(
          (v: any) =>
            Number(v.id) === Number(item.productId) ||
            Number(v.kiotviet_id) === Number(item.productId) ||
            (item.variantId && (Number(v.id) === Number(item.variantId) || Number(v.kiotviet_id) === Number(item.variantId))) ||
            (item.variant_id && (Number(v.id) === Number(item.variant_id) || Number(v.kiotviet_id) === Number(item.variant_id))) ||
            (item.product_variant_id && (Number(v.id) === Number(item.product_variant_id) || Number(v.kiotviet_id) === Number(item.product_variant_id))) ||
            (item.variant_db_id && Number(v.id) === Number(item.variant_db_id)) ||
            (item.kiotviet_id && (Number(v.id) === Number(item.kiotviet_id) || Number(v.kiotviet_id) === Number(item.kiotviet_id))) ||
            (v.code && item.productCode && v.code === item.productCode)
        )
    );
  }
  return p;
}

function findVariantInProduct(item: CartItem, variants: any[]): any {
  if (!variants || variants.length === 0) return undefined;
  return variants.find(
    (vObj: any) =>
      vObj.size === item.variant ||
      vObj.size_en === item.variant ||
      (item.variant_vi && (vObj.size === item.variant_vi || vObj.size_en === item.variant_vi)) ||
      (item.variant_en && (vObj.size_en === item.variant_en || vObj.size === item.variant_en)) ||
      (item.variantId && (Number(vObj.id) === Number(item.variantId) || Number(vObj.kiotviet_id) === Number(item.variantId))) ||
      (item.variant_id && (Number(vObj.id) === Number(item.variant_id) || Number(vObj.kiotviet_id) === Number(item.variant_id))) ||
      (item.product_variant_id && (Number(vObj.id) === Number(item.product_variant_id) || Number(vObj.kiotviet_id) === Number(item.product_variant_id))) ||
      (item.variant_db_id && Number(vObj.id) === Number(item.variant_db_id)) ||
      Number(vObj.id) === Number(item.productId) ||
      Number(vObj.kiotviet_id) === Number(item.productId) ||
      (item.kiotviet_id && (Number(vObj.id) === Number(item.kiotviet_id) || Number(vObj.kiotviet_id) === Number(item.kiotviet_id))) ||
      (vObj.code && item.productCode && vObj.code === item.productCode)
  );
}

export function checkItemOutOfStock(item: CartItem, cache: any[]): boolean {
  if (!item.productCode || !item.productCode.trim()) return true;
  if (!cache || cache.length === 0) return Boolean(item.isOutOfStock ?? false);

  const p = findProductInCache(item, cache);
  if (!p) return Boolean(item.isOutOfStock ?? false);

  if (p.variants && p.variants.length > 0) {
    const v = findVariantInProduct(item, p.variants);
    if (v) {
      if (!v.code || !v.code.trim()) return true;
      if (v.status === 0 || v.status === false) return true;
      return false;
    }
    if (!p.code || !p.code.trim()) return true;
    if (p.status === 0 || p.status === false) return true;
    return false;
  }

  if (!p.code || !p.code.trim()) return true;
  if (p.status === 0 || p.status === false) return true;
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
      const p = findProductInCache(item, productsCache);
      let basePrice = item.originalPrice || item.unitPrice;
      if (p) {
        if (p.variants && p.variants.length > 0) {
          const v = findVariantInProduct(item, p.variants);
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
      const p = findProductInCache(item, productsCache);
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
      const matchedV = p.variants && p.variants.length > 0 ? findVariantInProduct(item, p.variants) : undefined;
      if (matchedV) {
        matchedVariant = true;
        const vOrig = matchedV.original_price ? parseFloat(String(matchedV.original_price)) : 0;
        const vPrice = matchedV.price ? parseFloat(String(matchedV.price)) : 0;
        const vBase = vOrig > 0 ? vOrig : vPrice;
        const activeCampaign = matchedV.active_campaign || p.active_campaign;
        const vCamp = item.excludeCampaignPrice ? null : evaluateCampaign(matchedV.campaign_price, activeCampaign, vBase);
        
        if (item.excludeCampaignPrice) {
          origPrice = vBase > 0 ? vBase : undefined;
          currentPrice = vBase > 0 ? vBase : (vPrice > 0 ? vPrice : undefined);
        } else if (vCamp) {
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

      if (!matchedVariant && (p.original_price || p.price)) {
        const pOrig = p.original_price ? parseFloat(String(p.original_price)) : 0;
        const pPriceVal = p.price ? parseFloat(String(p.price)) : 0;
        const pBase = pOrig > 0 ? pOrig : pPriceVal;
        const activeCampaign = p.active_campaign;
        const pCamp = item.excludeCampaignPrice ? null : evaluateCampaign(p.campaign_price, activeCampaign, pBase);
        
        if (item.excludeCampaignPrice) {
          origPrice = pBase > 0 ? pBase : undefined;
          currentPrice = pBase > 0 ? pBase : (pPriceVal > 0 ? pPriceVal : undefined);
        } else if (pCamp) {
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

      // Self-healing for title_vi, variant_vi, title_en, variant_en, product_id, variant_id, parentProductId, db_id, kiotviet_id
      const viTranslation = p.translations?.find((t: any) => t.locale === "vi");
      const enTranslation = p.translations?.find((t: any) => t.locale === "en");
      const viTitle = p.custom_name || p.name || (viTranslation?.custom_name ?? viTranslation?.name ?? undefined);
      const enTitle = p.name_en || (enTranslation?.custom_name ?? enTranslation?.name ?? undefined);
      const viVariant = matchedV?.size || (matchedV?.translations?.find((t: any) => t.locale === "vi")?.size ?? undefined);
      const enVariant = matchedV?.size_en || (matchedV?.translations?.find((t: any) => t.locale === "en")?.size ?? undefined);

      const nextTitleVi = viTitle || item.title_vi;
      const nextVariantVi = viVariant || item.variant_vi;
      const nextTitleEn = enTitle || item.title_en;
      const nextVariantEn = enVariant || item.variant_en;
      const nextProductId = item.product_id ?? p.id ?? p.kiotviet_id;
      const nextParentProductId = item.parentProductId ?? p.id;
      const nextDbId = item.db_id ?? p.id;
      const nextProductDbId = item.product_db_id ?? p.id;
      const nextVariantId = item.variant_id ?? (matchedV?.id || matchedV?.kiotviet_id || item.variantId);
      const nextVariantDbId = item.variant_db_id ?? matchedV?.id;
      const nextKiotvietId = item.kiotviet_id ?? (matchedV?.kiotviet_id || p.kiotviet_id);

      const hasHealingChange =
        (viTitle && item.title_vi !== viTitle) ||
        (viVariant && item.variant_vi !== viVariant) ||
        (enTitle && item.title_en !== enTitle) ||
        (enVariant && item.variant_en !== enVariant) ||
        (!item.product_id && nextProductId !== undefined) ||
        (!item.parentProductId && nextParentProductId !== undefined) ||
        (!item.db_id && nextDbId !== undefined) ||
        (!item.product_db_id && nextProductDbId !== undefined) ||
        (!item.variant_id && nextVariantId !== undefined) ||
        (!item.variant_db_id && nextVariantDbId !== undefined) ||
        (!item.kiotviet_id && nextKiotvietId !== undefined);

      if (
        item.unitPrice !== newUnit ||
        item.originalPrice !== newOrig ||
        item.isOutOfStock !== isOut ||
        hasHealingChange
      ) {
        changed = true;
        return {
          ...item,
          unitPrice: newUnit,
          originalPrice: newOrig,
          isOutOfStock: isOut,
          title_vi: nextTitleVi,
          variant_vi: nextVariantVi,
          title_en: nextTitleEn,
          variant_en: nextVariantEn,
          product_id: nextProductId,
          parentProductId: nextParentProductId,
          db_id: nextDbId,
          product_db_id: nextProductDbId,
          variant_id: nextVariantId,
          variant_db_id: nextVariantDbId,
          kiotviet_id: nextKiotvietId,
        };
      }
      return item;
    });

    if (changed) {
      setCartItems(updated);
    }
  }, [isLoaded, productsCache, cartItems]);

  const addToCart = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    const isOutOfStock = checkItemOutOfStock(item as CartItem, productsCache) || Boolean((item as any).isOutOfStock);
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, ...item, quantity: i.quantity + quantity, isOutOfStock } : i
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

  const restoreCampaignItemsToOriginalPrice = (blockedProductIds?: number[]) => {
    const targetSet =
      Array.isArray(blockedProductIds) && blockedProductIds.length > 0
        ? new Set(blockedProductIds.map((id) => Number(id)).filter((id) => id > 0))
        : null;

    setCartItems((prev) =>
      prev.map((item) => {
        const isDiscounted = Boolean(item.originalPrice && item.originalPrice > item.unitPrice);
        if (!isDiscounted) return item;

        if (targetSet && targetSet.size > 0) {
          const itemIds = [
            item.productId,
            item.parentProductId,
            item.product_id,
            item.db_id,
            item.product_db_id,
            item.variantId,
            item.product_variant_id,
            item.variant_id,
            item.variant_db_id,
            item.kiotviet_id,
          ]
            .map((v) => Number(v))
            .filter((v) => !isNaN(v) && v > 0);

          const matchesTarget = itemIds.some((id) => targetSet.has(id));
          if (!matchesTarget) return item;
        }

        const restoredPrice = item.originalPrice || item.unitPrice;
        return {
          ...item,
          unitPrice: restoredPrice,
          originalPrice: restoredPrice,
          excludeCampaignPrice: true,
        };
      })
    );
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
        restoreCampaignItemsToOriginalPrice,
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
