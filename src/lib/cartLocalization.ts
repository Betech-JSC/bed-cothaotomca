import type { CartItem } from "@/contexts/CartContext";

const STANDARD_VARIANT_TOKENS = new Set([
  "",
  "tieu chuan",
  "tiêu chuẩn",
  "standard",
  "default",
  "mac dinh",
  "mặc định",
]);

const SIZE_SYNONYM_MAP: Record<string, string> = {
  nho: "__size_s__",
  "nhỏ": "__size_s__",
  small: "__size_s__",
  "size s": "__size_s__",
  "co nho": "__size_s__",
  "cỡ nhỏ": "__size_s__",
  vua: "__size_m__",
  "vừa": "__size_m__",
  "trung binh": "__size_m__",
  "trung bình": "__size_m__",
  medium: "__size_m__",
  "size m": "__size_m__",
  "co vua": "__size_m__",
  "cỡ vừa": "__size_m__",
  lon: "__size_l__",
  "lớn": "__size_l__",
  to: "__size_l__",
  large: "__size_l__",
  "size l": "__size_l__",
  "co lon": "__size_l__",
  "cỡ lớn": "__size_l__",
  "dac biet": "__size_xl__",
  "đặc biệt": "__size_xl__",
  special: "__size_xl__",
  "extra large": "__size_xl__",
  "size xl": "__size_xl__",
};

/**
 * Normalizes a variant/size label into a locale-independent token.
 */
export function normalizeVariantToken(val?: string | null): string {
  const raw = (val ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  if (STANDARD_VARIANT_TOKENS.has(raw)) {
    return "__standard__";
  }
  if (SIZE_SYNONYM_MAP[raw]) {
    return SIZE_SYNONYM_MAP[raw];
  }
  return raw;
}

function getResolvedProductId(item?: Partial<CartItem> | null): number | null {
  if (!item) return null;
  const candidates = [
    item.parentProductId,
    item.parent_product_id,
    item.product_db_id,
    item.product_id,
    item.db_id,
    item.productId,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function getVariantTokens(item?: Partial<CartItem> | null): Set<string> {
  const tokens = new Set<string>();
  if (!item) return tokens;
  const rawValues = [item.variant_vi, item.variant_en, item.variant];
  for (const v of rawValues) {
    if (typeof v === "string" && v.trim() !== "") {
      tokens.add(normalizeVariantToken(v));
      tokens.add(v.trim().toLowerCase().replace(/\s+/g, " "));
    }
  }
  if (tokens.size === 0) {
    tokens.add("__standard__");
  }
  return tokens;
}

function getSpecificVariantId(
  item?: Partial<CartItem> | null,
  resolvedProductId?: number | null
): number | null {
  if (!item) return null;
  const prodId = resolvedProductId ?? getResolvedProductId(item);
  const candidates = [
    item.variant_db_id,
    item.variantId,
    item.product_variant_id,
    item.variant_id,
  ];
  const tokens = getVariantTokens(item);
  const isStandard = tokens.has("__standard__");
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) {
      if (prodId && n === prodId && isStandard) {
        return null;
      }
      return n;
    }
  }
  return null;
}

/**
 * Generates a locale-independent canonical key for a cart item.
 */
export function getCanonicalCartItemKey(
  item?: (Partial<CartItem> & { code?: string }) | null
): string {
  if (!item) return "";
  const prodId = getResolvedProductId(item);
  const varId = getSpecificVariantId(item, prodId);
  const code = ((item as any).code || item.productCode || "").toString().trim().toUpperCase();
  const primaryVariantToken = normalizeVariantToken(
    item.variant_vi || item.variant_en || item.variant
  );

  if (prodId && varId && code) {
    return `prod-${prodId}-var-${varId}-code-${code}`;
  }
  if (prodId && varId) {
    return `prod-${prodId}-var-${varId}`;
  }
  if (prodId && primaryVariantToken === "__standard__") {
    return code ? `prod-${prodId}-code-${code}-var-__standard__` : `prod-${prodId}-var-__standard__`;
  }
  if (prodId && code) {
    return `prod-${prodId}-code-${code}-var-${primaryVariantToken}`;
  }
  if (prodId) {
    return `prod-${prodId}-var-${primaryVariantToken}`;
  }
  if (code) {
    return `code-${code}-var-${primaryVariantToken}`;
  }
  const slug = (item.slug || "").trim().toLowerCase();
  return `${slug || "item"}-${primaryVariantToken}`;
}

/**
 * Determines whether two cart items represent the exact same product and variant
 * regardless of the display locale (VI vs EN).
 */
export function isSameCartProductVariant(
  a?: (Partial<CartItem> & { code?: string }) | null,
  b?: (Partial<CartItem> & { code?: string }) | null
): boolean {
  if (!a || !b) return false;

  const codeA = ((a as any).code || a.productCode || "").toString().trim().toUpperCase();
  const codeB = ((b as any).code || b.productCode || "").toString().trim().toUpperCase();
  if (codeA && codeB && codeA !== codeB) {
    return false;
  }

  const hasExplicitVariantConflict =
    Boolean(
      a.variant_vi &&
        b.variant_vi &&
        normalizeVariantToken(a.variant_vi) !== normalizeVariantToken(b.variant_vi)
    ) ||
    Boolean(
      a.variant_en &&
        b.variant_en &&
        normalizeVariantToken(a.variant_en) !== normalizeVariantToken(b.variant_en)
    );

  if (hasExplicitVariantConflict) {
    return false;
  }

  const prodIdA = getResolvedProductId(a);
  const prodIdB = getResolvedProductId(b);
  const varIdA = getSpecificVariantId(a, prodIdA);
  const varIdB = getSpecificVariantId(b, prodIdB);

  if (varIdA !== null && varIdB !== null && varIdA !== varIdB) {
    return false;
  }

  if (a.id && b.id && a.id === b.id) return true;

  const keyA = getCanonicalCartItemKey(a);
  const keyB = getCanonicalCartItemKey(b);
  if (keyA && keyB && keyA === keyB) return true;

  const rawIdsA = new Set(
    [a.parentProductId, a.parent_product_id, a.product_db_id, a.product_id, a.db_id, a.productId]
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
  const rawIdsB = new Set(
    [b.parentProductId, b.parent_product_id, b.product_db_id, b.product_id, b.db_id, b.productId]
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
  );

  const sharesProductId =
    (prodIdA !== null && prodIdB !== null && prodIdA === prodIdB) ||
    Array.from(rawIdsA).some((id) => rawIdsB.has(id));

  if (prodIdA !== null && prodIdB !== null && !sharesProductId) {
    return false;
  }

  const tokensA = getVariantTokens(a);
  const tokensB = getVariantTokens(b);
  const sharesVariantToken = Array.from(tokensA).some((t) => tokensB.has(t));

  if (varIdA !== null && varIdB !== null && varIdA === varIdB) {
    const sharedKiotId =
      (a.kiotviet_id && Number(a.kiotviet_id) === varIdA) ||
      (b.kiotviet_id && Number(b.kiotviet_id) === varIdB);
    if (sharedKiotId && !sharesVariantToken) {
      return false;
    }
    return true;
  }

  if (sharesProductId && sharesVariantToken) {
    return true;
  }

  if (codeA && codeB && codeA === codeB && (sharesProductId || prodIdA === null || prodIdB === null)) {
    const normVarA = normalizeVariantToken(a.variant);
    const normVarB = normalizeVariantToken(b.variant);
    if (normVarA.startsWith("__size_") && normVarB.startsWith("__size_") && normVarA !== normVarB) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Merges two matching cart items, summing their quantities and preserving bilingual metadata.
 */
export function mergeCartItemPair(
  existing: CartItem,
  incoming: Omit<CartItem, "quantity"> & { quantity?: number },
  addedQuantity?: number
): CartItem {
  const qtyToAdd = addedQuantity !== undefined ? addedQuantity : (incoming.quantity ?? 1);
  const merged: CartItem = {
    ...existing,
    ...incoming,
    id: existing.id || incoming.id,
    title: incoming.title || existing.title,
    title_vi: incoming.title_vi || existing.title_vi,
    title_en: incoming.title_en || existing.title_en,
    variant: incoming.variant || existing.variant,
    variant_vi: incoming.variant_vi || existing.variant_vi,
    variant_en: incoming.variant_en || existing.variant_en,
    productCode: incoming.productCode || existing.productCode,
    product_id: incoming.product_id ?? existing.product_id,
    parentProductId: incoming.parentProductId ?? existing.parentProductId,
    parent_product_id: incoming.parent_product_id ?? existing.parent_product_id,
    db_id: incoming.db_id ?? existing.db_id,
    product_db_id: incoming.product_db_id ?? existing.product_db_id,
    variantId: incoming.variantId ?? existing.variantId,
    product_variant_id: incoming.product_variant_id ?? existing.product_variant_id,
    variant_id: incoming.variant_id ?? existing.variant_id,
    variant_db_id: incoming.variant_db_id ?? existing.variant_db_id,
    kiotviet_id: incoming.kiotviet_id ?? existing.kiotviet_id,
    quantity: existing.quantity + qtyToAdd,
  };
  if (!merged.id) {
    merged.id = getCanonicalCartItemKey(merged);
  }
  return merged;
}

/**
 * Deduplicates an array of cart items by merging entries that represent the same product & variant.
 */
export function mergeDuplicateCartItems(items: CartItem[]): CartItem[] {
  if (!Array.isArray(items) || items.length <= 1) return items;
  const result: CartItem[] = [];
  for (const item of items) {
    const existingIdx = result.findIndex((r) => isSameCartProductVariant(r, item));
    if (existingIdx !== -1) {
      result[existingIdx] = mergeCartItemPair(result[existingIdx], item, item.quantity);
    } else {
      const canonicalId = item.id || getCanonicalCartItemKey(item);
      result.push(canonicalId && item.id !== canonicalId ? { ...item, id: canonicalId } : item);
    }
  }
  return result;
}

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
  const fallback = item.variant || item.variant_vi || item.variant_en || "";
  if (normalizeVariantToken(fallback) === "__standard__") {
    if (locale === "en") return "Standard";
    if (locale === "vi") return "Tiêu chuẩn";
  }
  return fallback;
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
    v =
      p.variants.find(
        (vObj: any) =>
          (item.variant_db_id && Number(vObj.id) === Number(item.variant_db_id)) ||
          (item.variantId && Number(vObj.id) === Number(item.variantId)) ||
          (item.product_variant_id && Number(vObj.id) === Number(item.product_variant_id)) ||
          (item.variant_id && Number(vObj.id) === Number(item.variant_id)) ||
          (vObj.code && item.productCode && vObj.code === item.productCode) ||
          (vObj.size &&
            (vObj.size === item.variant ||
              vObj.size_en === item.variant ||
              (item.variant_vi && vObj.size === item.variant_vi) ||
              (item.variant_en && vObj.size === item.variant_en))) ||
          (vObj.size_en &&
            (vObj.size_en === item.variant ||
              (item.variant_en && vObj.size_en === item.variant_en) ||
              (item.variant_vi && vObj.size_en === item.variant_vi)))
      ) ||
      p.variants.find(
        (vObj: any) =>
          (item.productId && Number(vObj.id) === Number(item.productId)) ||
          (p.variants.length === 1 &&
            item.kiotviet_id &&
            (Number(vObj.id) === Number(item.kiotviet_id) ||
              Number(vObj.kiotviet_id) === Number(item.kiotviet_id)))
      );
  }

  const isStandardProduct = !p.variants || p.variants.length === 0;
  const viTranslation = p.translations?.find((t: any) => t.locale === "vi");
  const enTranslation = p.translations?.find((t: any) => t.locale === "en");
  const viTitle = p.custom_name || p.name || (viTranslation?.custom_name ?? viTranslation?.name ?? undefined);
  const enTitle = p.name_en || (enTranslation?.custom_name ?? enTranslation?.name ?? undefined);
  const viVariant =
    v?.size ||
    (v?.translations?.find((t: any) => t.locale === "vi")?.size ??
      (isStandardProduct && normalizeVariantToken(item.variant) === "__standard__" ? "Tiêu chuẩn" : undefined));
  const enVariant =
    v?.size_en ||
    (v?.translations?.find((t: any) => t.locale === "en")?.size ??
      (isStandardProduct && normalizeVariantToken(item.variant) === "__standard__" ? "Standard" : undefined));

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
