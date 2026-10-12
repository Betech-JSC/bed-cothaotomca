import type { CartItem } from "@/contexts/CartContext";

/**
 * Returns the localized title of a cart item based on current locale.
 * Fallback safely to item.title if locale is not 'en' or title_en is missing/empty.
 */
export function getCartItemTitle(
  item?: Partial<Pick<CartItem, "title" | "title_en">> | null,
  locale?: string
): string {
  if (!item) return "";
  if (locale === "en" && item.title_en && typeof item.title_en === "string" && item.title_en.trim() !== "") {
    return item.title_en;
  }
  return item.title || "";
}

/**
 * Returns the localized variant string of a cart item based on current locale.
 * Fallback safely to item.variant if locale is not 'en' or variant_en is missing/empty.
 */
export function getCartItemVariant(
  item?: Partial<Pick<CartItem, "variant" | "variant_en">> | null,
  locale?: string
): string {
  if (!item) return "";
  if (locale === "en" && item.variant_en && typeof item.variant_en === "string" && item.variant_en.trim() !== "") {
    return item.variant_en;
  }
  return item.variant || "";
}

/**
 * Self-heals a cart item using product cache data.
 * Populates title_en and variant_en if missing or outdated.
 */
export function healCartItem(item: CartItem, productsCache: any[]): CartItem {
  if (!productsCache || productsCache.length === 0) return item;

  const p = productsCache.find(
    (x: any) =>
      Number(x.id) === Number(item.productId) ||
      Number(x.kiotviet_id) === Number(item.productId) ||
      (item.parentProductId && Number(x.id) === Number(item.parentProductId)) ||
      (item.parentProductId && Number(x.kiotviet_id) === Number(item.parentProductId)) ||
      (x.slug && item.slug && x.slug === item.slug) ||
      (x.code && item.productCode && x.code === item.productCode) ||
      (x.variants &&
        x.variants.some(
          (v: any) =>
            Number(v.id) === Number(item.productId) ||
            Number(v.kiotviet_id) === Number(item.productId) ||
            (item.variantId && (Number(v.id) === Number(item.variantId) || Number(v.kiotviet_id) === Number(item.variantId))) ||
            (v.code && item.productCode && v.code === item.productCode)
        ))
  );

  if (!p) return item;

  let v: any = undefined;
  if (p.variants && p.variants.length > 0) {
    v = p.variants.find(
      (vObj: any) =>
        (item.variantId && (Number(vObj.id) === Number(item.variantId) || Number(vObj.kiotviet_id) === Number(item.variantId))) ||
        (item.productId && (Number(vObj.id) === Number(item.productId) || Number(vObj.kiotviet_id) === Number(item.productId))) ||
        (vObj.size && (vObj.size === item.variant || vObj.size_en === item.variant)) ||
        (vObj.code && item.productCode && vObj.code === item.productCode)
    );
  }

  const enTitle = p.name_en || (p.translations?.find((t: any) => t.locale === "en")?.name ?? undefined);
  const enVariant = v?.size_en || (v?.translations?.find((t: any) => t.locale === "en")?.size ?? undefined);

  let updated = false;
  const newItem = { ...item };

  if (enTitle && newItem.title_en !== enTitle) {
    newItem.title_en = enTitle;
    updated = true;
  }

  if (enVariant && newItem.variant_en !== enVariant) {
    newItem.variant_en = enVariant;
    updated = true;
  }

  if (p && !newItem.product_id) {
    newItem.product_id = p.id || p.kiotviet_id;
  }

  if (v && !newItem.variant_id) {
    newItem.variant_id = v.id || v.kiotviet_id;
  }

  return updated ? newItem : item;
}
