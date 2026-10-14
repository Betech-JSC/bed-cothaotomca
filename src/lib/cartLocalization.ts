import type { CartItem } from "@/contexts/CartContext";

/**
 * Returns the localized title of a cart item based on current locale.
 * Fallback safely to item.title if locale is not 'en' or title_en is missing/empty.
 */
export function getCartItemTitle(
  item?: Partial<Pick<CartItem, "title" | "title_en" | "title_vi">> | null,
  locale?: string
): string {
  if (!item) return "";
  if (locale === "en" && item.title_en && typeof item.title_en === "string" && item.title_en.trim() !== "") {
    return item.title_en;
  }
  if (locale === "vi" && item.title_vi && typeof item.title_vi === "string" && item.title_vi.trim() !== "") {
    return item.title_vi;
  }
  return item.title || item.title_vi || item.title_en || "";
}

/**
 * Returns the localized variant string of a cart item based on current locale.
 * Fallback safely to item.variant if locale is not 'en' or variant_en is missing/empty.
 */
export function getCartItemVariant(
  item?: Partial<Pick<CartItem, "variant" | "variant_en" | "variant_vi">> | null,
  locale?: string
): string {
  if (!item) return "";
  if (locale === "en" && item.variant_en && typeof item.variant_en === "string" && item.variant_en.trim() !== "") {
    return item.variant_en;
  }
  if (locale === "vi" && item.variant_vi && typeof item.variant_vi === "string" && item.variant_vi.trim() !== "") {
    return item.variant_vi;
  }
  return item.variant || item.variant_vi || item.variant_en || "";
}

/**
 * Self-heals a cart item using product cache data.
 * Populates title_vi, variant_vi, title_en, variant_en and canonical IDs if missing or outdated.
 */
export function healCartItem(item: CartItem, productsCache: any[]): CartItem {
  if (!productsCache || productsCache.length === 0) return item;

  const p = productsCache.find(
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
      (x.code && item.productCode && x.code === item.productCode) ||
      (x.variants &&
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
        ))
  );

  if (!p) return item;

  let v: any = undefined;
  if (p.variants && p.variants.length > 0) {
    v = p.variants.find(
      (vObj: any) =>
        (item.variantId && (Number(vObj.id) === Number(item.variantId) || Number(vObj.kiotviet_id) === Number(item.variantId))) ||
        (item.variant_id && (Number(vObj.id) === Number(item.variant_id) || Number(vObj.kiotviet_id) === Number(item.variant_id))) ||
        (item.product_variant_id && (Number(vObj.id) === Number(item.product_variant_id) || Number(vObj.kiotviet_id) === Number(item.product_variant_id))) ||
        (item.variant_db_id && Number(vObj.id) === Number(item.variant_db_id)) ||
        (item.productId && (Number(vObj.id) === Number(item.productId) || Number(vObj.kiotviet_id) === Number(item.productId))) ||
        (item.kiotviet_id && (Number(vObj.id) === Number(item.kiotviet_id) || Number(vObj.kiotviet_id) === Number(item.kiotviet_id))) ||
        (vObj.size &&
          (vObj.size === item.variant ||
            vObj.size_en === item.variant ||
            (item.variant_vi && vObj.size === item.variant_vi) ||
            (item.variant_en && vObj.size === item.variant_en))) ||
        (vObj.size_en &&
          (vObj.size_en === item.variant ||
            (item.variant_en && vObj.size_en === item.variant_en) ||
            (item.variant_vi && vObj.size_en === item.variant_vi))) ||
        (vObj.code && item.productCode && vObj.code === item.productCode)
    );
  }

  const viTranslation = p.translations?.find((t: any) => t.locale === "vi");
  const enTranslation = p.translations?.find((t: any) => t.locale === "en");
  const viTitle = p.custom_name || p.name || (viTranslation?.custom_name ?? viTranslation?.name ?? undefined);
  const enTitle = p.name_en || (enTranslation?.custom_name ?? enTranslation?.name ?? undefined);
  const viVariant = v?.size || (v?.translations?.find((t: any) => t.locale === "vi")?.size ?? undefined);
  const enVariant = v?.size_en || (v?.translations?.find((t: any) => t.locale === "en")?.size ?? undefined);

  let updated = false;
  const newItem = { ...item };

  if (viTitle && newItem.title_vi !== viTitle) {
    newItem.title_vi = viTitle;
    updated = true;
  }

  if (enTitle && newItem.title_en !== enTitle) {
    newItem.title_en = enTitle;
    updated = true;
  }

  if (viVariant && newItem.variant_vi !== viVariant) {
    newItem.variant_vi = viVariant;
    updated = true;
  }

  if (enVariant && newItem.variant_en !== enVariant) {
    newItem.variant_en = enVariant;
    updated = true;
  }

  const resolvedProductId = p.id || p.kiotviet_id;
  if (resolvedProductId && !newItem.product_id) {
    newItem.product_id = resolvedProductId;
    updated = true;
  }

  if (p.id && !newItem.parentProductId) {
    newItem.parentProductId = p.id;
    updated = true;
  }

  if (p.id && !newItem.db_id) {
    newItem.db_id = p.id;
    updated = true;
  }

  if (p.id && !newItem.product_db_id) {
    newItem.product_db_id = p.id;
    updated = true;
  }

  const resolvedVariantId = v?.id || v?.kiotviet_id || newItem.variantId;
  if (resolvedVariantId && !newItem.variant_id) {
    newItem.variant_id = resolvedVariantId;
    updated = true;
  }

  if (v?.id && !newItem.variant_db_id) {
    newItem.variant_db_id = v.id;
    updated = true;
  }

  if (v?.id && !newItem.variantId) {
    newItem.variantId = v.id;
    updated = true;
  }

  if (v?.id && !newItem.product_variant_id) {
    newItem.product_variant_id = v.id;
    updated = true;
  }

  const resolvedKiotvietId = v?.kiotviet_id || p.kiotviet_id;
  if (resolvedKiotvietId && !newItem.kiotviet_id) {
    newItem.kiotviet_id = resolvedKiotvietId;
    updated = true;
  }

  return updated ? newItem : item;
}
