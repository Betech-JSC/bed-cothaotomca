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
  product_name?: string | null;
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
  image: string;
  original_price: number;
  campaign_price: number;
  is_free: boolean;
  is_available?: boolean;
  disabled?: boolean;
  disabled_reason?: string;
  kiotviet_id?: number | null;
  product?: {
    id: number;
    name: string;
    price: number;
    image?: string;
    slug?: string;
  };
}

export interface CampaignSettings {
  buy_quantity?: number;
  gift_quantity?: number;
  get_quantity?: number;
  min_order_value?: number;
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
  settings?: CampaignSettings;
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
  settings?: CampaignSettings;
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

/**
 * Filter items for gift-giving promotions (especially buy_x_get_y) so that trigger products
 * (items that user has to buy) are NEVER presented to the user as selectable gifts.
 */
export function getBuyXGetYGiftOnlyItems(
  promo?: ActivePromotion | PublicCampaignItem | null
): PromotionGiftItem[] {
  if (!promo || !promo.items || !Array.isArray(promo.items) || promo.items.length === 0) {
    return [];
  }

  const isBuyXGetY = promo.promotion_type === "buy_x_get_y";
  const triggerItems = promo.settings?.trigger_items || [];
  const giftItems = promo.settings?.gift_items || [];

  if (!isBuyXGetY && triggerItems.length === 0) {
    return promo.items;
  }

  const matchesSpec = (
    item: PromotionGiftItem,
    specList: Array<{ product_id: number | string; product_variant_id?: number | string | null }>
  ) => {
    return specList.some((spec) => {
      const pidMatch = Number(spec.product_id) === Number(item.product_id);
      if (!pidMatch) return false;
      if (spec.product_variant_id != null && item.product_variant_id != null) {
        return Number(spec.product_variant_id) === Number(item.product_variant_id);
      }
      return true;
    });
  };

  // 1. If gift_items are configured in settings, exclusively return items matching gift_items
  if (giftItems.length > 0) {
    const matchedGifts = promo.items.filter((item) => {
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
    const nonTriggers = promo.items.filter((item) => !matchesSpec(item, triggerItems));
    if (nonTriggers.length > 0) {
      return nonTriggers;
    }
  }

  // 3. Fallback: exclude items where campaign_price >= original_price if there are free/discounted items
  const freeOrDiscounted = promo.items.filter(
    (item) => item.is_free || (item.original_price > 0 && item.campaign_price < item.original_price) || item.campaign_price === 0
  );
  if (freeOrDiscounted.length > 0) {
    return freeOrDiscounted;
  }

  return promo.items;
}

