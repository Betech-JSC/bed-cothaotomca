export type PromotionType =
  | "order_discount"
  | "order_gift_discount"
  | "buy_x_get_y"
  | "same_price_discount";

export type DiscountType = "percent" | "fixed" | "custom";

export interface CampaignTriggerItem {
  product_id: number;
  product_variant_id?: number | null;
  variant_name?: string | null;
  variant_name_en?: string | null;
  variant_name_vi?: string | null;
  product_name?: string | null;
  product_name_en?: string | null;
  product_name_vi?: string | null;
  product_code?: string | null;
  variant_codes?: string[];
  kiotviet_id?: number | null;
  product_kiotviet_id?: number | null;
  variant_kiotviet_id?: number | null;
  variant_kiotviet_ids?: number[];
  variant_db_ids?: number[];
  min_quantity?: number;
}

export interface CampaignGiftSettingItem {
  product_id: number;
  product_variant_id?: number | null;
  quantity?: number;
}

export interface PromotionGiftItem {
  id: number;
  campaign_id?: number;
  product_id: number;
  product_variant_id?: number | null;
  product_code: string;
  product_name: string;
  product_name_en?: string | null;
  product_name_vi?: string | null;
  variant_name?: string | null;
  variant_name_en?: string | null;
  variant_name_vi?: string | null;
  image: string;
  original_price: number;
  campaign_price: number;
  is_free: boolean;
  is_available?: boolean;
  disabled?: boolean;
  disabled_reason?: string;
  kiotviet_id?: number | null;
  variant_kiotviet_ids?: number[];
  variant_db_ids?: number[];
  product?: {
    id: number;
    name: string;
    name_en?: string;
    price: number;
    image?: string;
    slug?: string;
  };
}

export interface CampaignSettings {
  buy_quantity?: number;
  min_quantity?: number;
  gift_quantity?: number;
  get_quantity?: number;
  min_order_value?: number;
  usage_limit_per_user?: number | null;
  trigger_items?: CampaignTriggerItem[];
  gift_items?: CampaignGiftSettingItem[];
}

export interface ActivePromotion {
  id: number;
  name: string;
  description?: string | null;
  banner?: string | null;
  promotion_type: PromotionType;
  min_order_value: number;
  discount_type: DiscountType | string;
  discount_value: number;
  max_discount?: number | null;
  usage_limit_per_user?: number | null;
  settings?: CampaignSettings;
  trigger_items?: CampaignTriggerItem[];
  items: PromotionGiftItem[];
  applicable_product_ids?: number[];
  applicable_variant_ids?: number[];
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
}

export interface PublicCampaignItem {
  id: number | string;
  name: string;
  code?: string;
  status?: boolean;
  special_note?: string;
  description?: string;
  banner?: string;
  promotion_type?: PromotionType;
  discount_type?: DiscountType;
  discount_value?: number;
  min_order_value?: number;
  max_discount?: number | null;
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
  usage_limit_per_user?: number | null;
  settings?: CampaignSettings;
  trigger_items?: CampaignTriggerItem[];
  items?: PromotionGiftItem[];
  applicable_product_ids?: number[];
  applicable_variant_ids?: number[];
  terms?: string;
  start_at?: string | null;
  end_at?: string | null;
}

export interface CampaignEligibilityResult {
  eligible: boolean;
  reason?: string;
  missingAmount?: number;
}

export interface CampaignLockResult {
  locked: boolean;
  reason?: string;
  reasonCode?: string;
}

export interface CheckoutConfigDeliveryType {
  value: string;
  label: string;
}

export interface CheckoutConfigBranch {
  id: number;
  branchName: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
}

export interface CheckoutConfigOperatingHours {
  store_open: string;
  store_close: string;
  delivery_open: string;
  delivery_close: string;
  last_order_cutoff?: string;
  is_store_open: boolean;
  is_delivery_open: boolean;
  can_order_now?: boolean;
  current_time?: string;
  message?: string | null;
}

export interface CheckoutConfigData {
  delivery_types?: CheckoutConfigDeliveryType[];
  default_shipping_fee?: string;
  branches?: CheckoutConfigBranch[];
  operating_hours?: CheckoutConfigOperatingHours;
  active_promotions?: ActivePromotion[];
  payment_methods?: unknown[];
  delivery_services?: unknown[];
  shipping_settings?: unknown;
  maintenance?: unknown;
}

function parseCampaignSettings(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return { ...raw };
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeCampaignGiftItem(it: any): PromotionGiftItem {
  return {
    ...it,
    id: it.id,
    product_id: it.product_id,
    product_variant_id: it.product_variant_id,
    product_name: it.product_name,
    product_name_en: it.product_name_en,
    product_name_vi: it.product_name_vi,
    variant_name: it.variant_name,
    variant_name_en: it.variant_name_en,
    variant_name_vi: it.variant_name_vi,
    product_code: it.product_code,
    kiotviet_id: it.kiotviet_id,
    variant_kiotviet_ids: it.variant_kiotviet_ids,
    variant_db_ids: it.variant_db_ids,
    image: it.image || "",
    original_price: it.original_price || 0,
    campaign_price: it.campaign_price || 0,
    is_free: it.is_free ?? (it.campaign_price === 0),
    is_available: it.is_available ?? !it.disabled,
    disabled: it.disabled ?? false,
    disabled_reason: it.disabled_reason || null,
  };
}

/**
 * Deep-merges two campaign records (e.g. from active_promotions and publicCampaigns)
 * preserving settings (trigger_items, gift_items), trigger_items, applicable_product_ids,
 * applicable_variant_ids, and enriched items.
 */
export function mergeCampaignObjects(baseObj: any, enrichObj: any): any {
  const baseSettings = parseCampaignSettings(baseObj?.settings);
  const enrichSettings = parseCampaignSettings(enrichObj?.settings);

  const baseTriggers: any[] =
    Array.isArray(baseSettings.trigger_items) && baseSettings.trigger_items.length > 0
      ? baseSettings.trigger_items
      : Array.isArray(baseObj?.trigger_items) && baseObj.trigger_items.length > 0
        ? baseObj.trigger_items
        : [];

  const enrichTriggers: any[] =
    Array.isArray(enrichSettings.trigger_items) && enrichSettings.trigger_items.length > 0
      ? enrichSettings.trigger_items
      : Array.isArray(enrichObj?.trigger_items) && enrichObj.trigger_items.length > 0
        ? enrichObj.trigger_items
        : [];

  let mergedTriggerItems: any[] = [];
  if (baseTriggers.length > 0 && enrichTriggers.length > 0) {
    const usedBaseIndices = new Set<number>();
    mergedTriggerItems = enrichTriggers.map((et: any) => {
      if (!et || typeof et !== "object") return et;
      const etPid = Number(et.product_id ?? et.id ?? et.productId ?? 0);
      const etVid = Number(et.product_variant_id ?? et.variant_id ?? et.variantId ?? 0);
      const matchIdx = baseTriggers.findIndex((bt: any, idx: number) => {
        if (usedBaseIndices.has(idx) || !bt || typeof bt !== "object") return false;
        const btPid = Number(bt.product_id ?? bt.id ?? bt.productId ?? 0);
        const btVid = Number(bt.product_variant_id ?? bt.variant_id ?? bt.variantId ?? 0);
        if (etPid > 0 && btPid > 0 && etPid === btPid) {
          if (etVid > 0 && btVid > 0) return etVid === btVid;
          return true;
        }
        return false;
      });
      if (matchIdx !== -1) {
        usedBaseIndices.add(matchIdx);
        return { ...baseTriggers[matchIdx], ...et };
      }
      return et;
    });
    baseTriggers.forEach((bt: any, idx: number) => {
      if (!usedBaseIndices.has(idx)) {
        mergedTriggerItems.push(bt);
      }
    });
  } else if (enrichTriggers.length > 0) {
    mergedTriggerItems = [...enrichTriggers];
  } else if (baseTriggers.length > 0) {
    mergedTriggerItems = [...baseTriggers];
  }

  const baseGifts: any[] = Array.isArray(baseSettings.gift_items) ? baseSettings.gift_items : [];
  const enrichGifts: any[] = Array.isArray(enrichSettings.gift_items) ? enrichSettings.gift_items : [];
  const mergedGiftItems = enrichGifts.length > 0 ? enrichGifts : baseGifts;

  const mergedSettings: Record<string, any> = {
    ...baseSettings,
    ...enrichSettings,
  };
  if (mergedTriggerItems.length > 0) {
    mergedSettings.trigger_items = mergedTriggerItems;
  }
  if (mergedGiftItems.length > 0) {
    mergedSettings.gift_items = mergedGiftItems;
  }

  const baseItems: PromotionGiftItem[] = Array.isArray(baseObj?.items)
    ? baseObj.items.map(normalizeCampaignGiftItem)
    : [];
  const rawEnrichItems: any[] =
    Array.isArray(enrichObj?.items) && enrichObj.items.length > 0
      ? enrichObj.items
      : Array.isArray(enrichObj?.gift_items) && enrichObj.gift_items.length > 0
        ? enrichObj.gift_items
        : [];
  const enrichItems: PromotionGiftItem[] = rawEnrichItems.map(normalizeCampaignGiftItem);

  let mergedItems: PromotionGiftItem[] = [];
  if (baseItems.length === 0) {
    mergedItems = enrichItems;
  } else if (enrichItems.length === 0) {
    mergedItems = baseItems;
  } else {
    mergedItems = [...baseItems];
    for (const normIt of enrichItems) {
      const idx = mergedItems.findIndex(
        (m) =>
          (m.id != null && normIt.id != null && Number(m.id) === Number(normIt.id)) ||
          (m.product_id != null &&
            normIt.product_id != null &&
            Number(m.product_id) === Number(normIt.product_id) &&
            Number(m.product_variant_id || 0) === Number(normIt.product_variant_id || 0))
      );
      if (idx !== -1) {
        const cur = mergedItems[idx];
        mergedItems[idx] = {
          ...cur,
          ...normIt,
          image: normIt.image || cur.image || "",
          product_name: normIt.product_name || cur.product_name,
          product_name_en: normIt.product_name_en || cur.product_name_en,
          product_name_vi: normIt.product_name_vi || cur.product_name_vi,
          variant_name: normIt.variant_name || cur.variant_name,
          variant_name_en: normIt.variant_name_en || cur.variant_name_en,
          variant_name_vi: normIt.variant_name_vi || cur.variant_name_vi,
          product_code: normIt.product_code || cur.product_code,
          kiotviet_id: normIt.kiotviet_id ?? cur.kiotviet_id,
          variant_kiotviet_ids: normIt.variant_kiotviet_ids ?? cur.variant_kiotviet_ids,
          variant_db_ids: normIt.variant_db_ids ?? cur.variant_db_ids,
        };
      } else {
        mergedItems.push(normIt);
      }
    }
  }

  const applicableProductIds =
    Array.isArray(enrichObj?.applicable_product_ids) && enrichObj.applicable_product_ids.length > 0
      ? enrichObj.applicable_product_ids
      : baseObj?.applicable_product_ids;

  const applicableVariantIds =
    Array.isArray(enrichObj?.applicable_variant_ids) && enrichObj.applicable_variant_ids.length > 0
      ? enrichObj.applicable_variant_ids
      : baseObj?.applicable_variant_ids;

  return {
    ...baseObj,
    ...enrichObj,
    id:
      baseObj?.id !== undefined
        ? baseObj.id
        : typeof enrichObj?.id === "number"
          ? enrichObj.id
          : parseInt(String(enrichObj?.id), 10) || 0,
    name: baseObj?.name || enrichObj?.name,
    description: baseObj?.description || enrichObj?.description || null,
    banner: baseObj?.banner || enrichObj?.banner || null,
    promotion_type: baseObj?.promotion_type || enrichObj?.promotion_type,
    min_order_value: baseObj?.min_order_value || enrichObj?.min_order_value || 0,
    discount_type: baseObj?.discount_type || enrichObj?.discount_type,
    discount_value: baseObj?.discount_value ?? enrichObj?.discount_value ?? 0,
    max_discount: baseObj?.max_discount ?? enrichObj?.max_discount ?? null,
    usage_limit_per_user:
      baseObj?.usage_limit_per_user ??
      enrichObj?.usage_limit_per_user ??
      mergedSettings.usage_limit_per_user ??
      null,
    settings: mergedSettings,
    can_combine_with_promotions:
      baseObj?.can_combine_with_promotions ?? enrichObj?.can_combine_with_promotions ?? true,
    can_combine_with_freeship:
      baseObj?.can_combine_with_freeship ?? enrichObj?.can_combine_with_freeship ?? true,
    applicable_product_ids: applicableProductIds,
    applicable_variant_ids: applicableVariantIds,
    trigger_items:
      mergedTriggerItems.length > 0
        ? mergedTriggerItems
        : enrichObj?.trigger_items || baseObj?.trigger_items,
    items: mergedItems,
  };
}

/**
 * Merges active_promotions (from /orders/checkout-config) and publicCampaigns (from /campaigns/active),
 * performing deep-merge on matching campaign IDs instead of skipping duplicates.
 */
export function mergePromotionsWithPublicCampaigns(
  activePromotions?: Array<ActivePromotion | PublicCampaignItem | Record<string, any>> | null,
  publicCampaigns?: PublicCampaignItem[] | null
): ActivePromotion[] {
  const list: ActivePromotion[] = (activePromotions || []).map((p: any) => ({
    ...p,
    settings: parseCampaignSettings(p.settings),
    items: Array.isArray(p.items) ? p.items.map(normalizeCampaignGiftItem) : [],
  }));

  const indexById = new Map<string, number>();
  list.forEach((p, idx) => {
    indexById.set(String(p.id), idx);
  });

  for (const c of publicCampaigns || []) {
    const idKey = String(c.id);
    const existingIdx = indexById.get(idKey);
    if (existingIdx !== undefined) {
      list[existingIdx] = mergeCampaignObjects(list[existingIdx], c) as ActivePromotion;
    } else {
      const normalized = mergeCampaignObjects({}, c) as ActivePromotion;
      indexById.set(idKey, list.length);
      list.push(normalized);
    }
  }

  return list;
}

/**
 * Filter items for gift-giving promotions (especially buy_x_get_y) so that trigger products
 * (items that user has to buy) are NEVER presented to the user as selectable gifts.
 */
export function getBuyXGetYGiftOnlyItems(
  promo?: ActivePromotion | PublicCampaignItem | null
): PromotionGiftItem[] {
  if (!promo) return [];

  const rawItems = (promo.items && Array.isArray(promo.items) && promo.items.length > 0)
    ? promo.items
    : ((promo as any).gift_items && Array.isArray((promo as any).gift_items) ? (promo as any).gift_items : []);

  if (rawItems.length === 0) {
    return [];
  }

  const isBuyXGetY = promo.promotion_type === "buy_x_get_y";
  const triggerItems: any[] = promo.settings?.trigger_items || (promo as any).trigger_items || [];
  const giftItems: any[] = promo.settings?.gift_items || (promo as any).gift_items_config || [];

  if (!isBuyXGetY && triggerItems.length === 0) {
    return rawItems;
  }

  const matchesSpec = (
    item: PromotionGiftItem,
    specList: Array<any>
  ) => {
    return specList.some((spec) => {
      const specPid = typeof spec === "object" && spec !== null
        ? Number(spec.product_id ?? spec.id ?? spec.productId)
        : Number(spec);
      if (isNaN(specPid) || specPid <= 0) return false;
      const pidMatch = specPid === Number(item.product_id);
      if (!pidMatch) return false;
      const specVid = typeof spec === "object" && spec !== null
        ? (spec.product_variant_id ?? spec.variantId ?? spec.variant_id)
        : null;
      if (specVid != null && Number(specVid) > 0 && item.product_variant_id != null) {
        return Number(specVid) === Number(item.product_variant_id);
      }
      return true;
    });
  };

  // 1. If gift_items are configured in settings, exclusively return items matching gift_items
  if (giftItems.length > 0) {
    const matchedGifts = rawItems.filter((item) => {
      const isTrigger = triggerItems.length > 0 && matchesSpec(item, triggerItems);
      if (isTrigger) return false;
      return matchesSpec(item, giftItems);
    });
    if (matchedGifts.length > 0) {
      return matchedGifts;
    }
  }

  // 2. If trigger_items are configured, exclude any items matching trigger_items
  if (triggerItems.length > 0) {
    const nonTriggers = rawItems.filter((item) => !matchesSpec(item, triggerItems));
    if (nonTriggers.length > 0) {
      return nonTriggers;
    }
  }

  // 3. Fallback: exclude items where campaign_price >= original_price if there are free/discounted items
  const freeOrDiscounted = rawItems.filter(
    (item) => item.is_free || (item.original_price > 0 && item.campaign_price < item.original_price) || item.campaign_price === 0
  );
  if (freeOrDiscounted.length > 0) {
    return freeOrDiscounted;
  }

  return rawItems;
}

